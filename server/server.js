const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const useragent = require('useragent');
const { query } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';
const SHORT_LINK_BASE_URL = process.env.SHORT_LINK_BASE_URL || 'http://localhost:5000/r';

// Middleware
app.use(cors());
app.use(express.json());

// Helper to determine Device Type from User Agent and OS
function parseDeviceAndBrowser(userAgentStr) {
  const agent = useragent.parse(userAgentStr);
  const browser = agent.family;
  const os = agent.os.family;
  
  let device = 'Desktop';
  const uaLower = userAgentStr.toLowerCase();
  
  if (/mobile|iphone|ipod|android/i.test(uaLower)) {
    device = 'Mobile';
  } else if (/ipad|tablet/i.test(uaLower)) {
    device = 'Tablet';
  } else if (/windows|mac os x|linux/i.test(uaLower)) {
    device = 'Desktop';
  }
  
  return { browser, device };
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ==========================================
// 1. INSTANT SHORT LINK REDIRECTION
// ==========================================
app.get('/r/:referral_code', async (req, res) => {
  const { referral_code } = req.params;
  
  try {
    // Look up the link
    const linkQuery = 'SELECT * FROM links WHERE referral_code = $1';
    const linkRes = await query(linkQuery, [referral_code]);
    
    if (linkRes.rows.length === 0) {
      return res.status(404).send('<h1>Link Not Found</h1><p>The link you are trying to access does not exist.</p>');
    }
    
    const link = linkRes.rows[0];
    const destinationUrl = link.destination_url;
    
    // Parse client headers asynchronously to keep redirect fast (or write, then redirect)
    // To ensure accurate logs, we log then redirect immediately. Since DB insert is fast, we await it.
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || '';
    const { browser, device } = parseDeviceAndBrowser(userAgent);
    
    // Insert click record
    const clickQuery = `
      INSERT INTO clicks (link_id, ip_address, user_agent, device, browser)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await query(clickQuery, [link.id, ip, userAgent, device, browser]);
    
    // Perform redirection (302)
    return res.redirect(302, destinationUrl);
  } catch (error) {
    console.error('Error during redirection:', error);
    return res.status(500).send('<h1>Internal Server Error</h1>');
  }
});

// ==========================================
// 2. ADMIN AUTH ROUTES
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userRes = await query(userQuery, [email]);
    
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = userRes.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    return res.json({ token, email: user.email });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Route to verify token validity
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  return res.json({ valid: true, email: req.user.email });
});

// ==========================================
// 3. LINK CRUD ROUTES (AUTHENTICATED)
// ==========================================

// Get all links with aggregate stats
app.get('/api/links', authenticateToken, async (req, res) => {
  try {
    const linksQuery = `
      SELECT 
        l.id,
        l.destination_url,
        l.short_code,
        l.referral_code,
        l.qr_image,
        l.created_at,
        COUNT(c.id) AS clicks,
        COUNT(DISTINCT c.ip_address) AS unique_visitors
      FROM links l
      LEFT JOIN clicks c ON l.id = c.link_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;
    const linksRes = await query(linksQuery);
    
    // Parse aggregate types properly
    const links = linksRes.rows.map(row => ({
      ...row,
      clicks: parseInt(row.clicks, 10),
      unique_visitors: parseInt(row.unique_visitors, 10)
    }));
    
    return res.json(links);
  } catch (error) {
    console.error('Error fetching links:', error);
    return res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// Create a new link
app.post('/api/links', authenticateToken, async (req, res) => {
  const { destination_url, referral_code } = req.body;
  
  if (!destination_url || !referral_code) {
    return res.status(400).json({ error: 'Destination URL and referral code are required' });
  }
  
  // Clean referral code (remove leading slashes, convert to lowercase alphanumeric/hyphens)
  let cleanReferralCode = referral_code.trim().toLowerCase().replace(/^\/+/, '');
  // Validate clean referral code format
  if (!/^[a-z0-9-_]+$/.test(cleanReferralCode)) {
    return res.status(400).json({ error: 'Referral code must contain only letters, numbers, hyphens, and underscores' });
  }
  
  try {
    // Check if referral code is already taken
    const checkQuery = 'SELECT id FROM links WHERE referral_code = $1';
    const checkRes = await query(checkQuery, [cleanReferralCode]);
    if (checkRes.rows.length > 0) {
      return res.status(409).json({ error: 'Referral code is already in use' });
    }
    
    // Generate unique base short code
    const short_code = Math.random().toString(36).substring(2, 8);
    
    // Generate QR Code
    const shortUrl = `${SHORT_LINK_BASE_URL}/${cleanReferralCode}`;
    const qr_image = await QRCode.toDataURL(shortUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 300,
      color: {
        dark: '#1e293b', // slate-800
        light: '#ffffff'
      }
    });
    
    // Save to database
    const insertQuery = `
      INSERT INTO links (destination_url, short_code, referral_code, qr_image)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const insertRes = await query(insertQuery, [destination_url, short_code, cleanReferralCode, qr_image]);
    
    return res.status(212).json({
      ...insertRes.rows[0],
      clicks: 0,
      unique_visitors: 0
    });
  } catch (error) {
    console.error('Error creating link:', error);
    return res.status(500).json({ error: 'Failed to create link' });
  }
});

// Regenerate QR Code
app.post('/api/links/:id/regenerate-qr', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const linkRes = await query('SELECT * FROM links WHERE id = $1', [id]);
    if (linkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    const link = linkRes.rows[0];
    const shortUrl = `${SHORT_LINK_BASE_URL}/${link.referral_code}`;
    
    // Regenerate QR Code (for cases where base URL changed or update is forced)
    const qr_image = await QRCode.toDataURL(shortUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 300,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });
    
    await query('UPDATE links SET qr_image = $1 WHERE id = $2', [qr_image, id]);
    return res.json({ success: true, qr_image });
  } catch (error) {
    console.error('Error regenerating QR:', error);
    return res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
});

// Delete a link
app.delete('/api/links/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const deleteQuery = 'DELETE FROM links WHERE id = $1 RETURNING *';
    const deleteRes = await query(deleteQuery, [id]);
    
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    return res.json({ message: 'Link deleted successfully', deletedLink: deleteRes.rows[0] });
  } catch (error) {
    console.error('Error deleting link:', error);
    return res.status(500).json({ error: 'Failed to delete link' });
  }
});

// ==========================================
// 4. ANALYTICS ROUTES (AUTHENTICATED)
// ==========================================

// Dashboard Summary Cards
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    // Total clicks
    const totalClicksRes = await query('SELECT COUNT(*) FROM clicks');
    const totalClicks = parseInt(totalClicksRes.rows[0].count, 10);
    
    // Unique visitors (by IP address)
    const uniqueRes = await query('SELECT COUNT(DISTINCT ip_address) FROM clicks');
    const uniqueVisitors = parseInt(uniqueRes.rows[0].count, 10);
    
    // Total links
    const totalLinksRes = await query('SELECT COUNT(*) FROM links');
    const activeLinks = parseInt(totalLinksRes.rows[0].count, 10);
    
    // Most popular link (by click count)
    const popularRes = await query(`
      SELECT l.referral_code, COUNT(c.id) as clicks
      FROM links l
      JOIN clicks c ON l.id = c.link_id
      GROUP BY l.referral_code
      ORDER BY clicks DESC
      LIMIT 1
    `);
    const popularLink = popularRes.rows.length > 0 ? {
      referral_code: popularRes.rows[0].referral_code,
      clicks: parseInt(popularRes.rows[0].clicks, 10)
    } : null;
    
    // Last visited timestamp
    const lastVisitedRes = await query('SELECT created_at FROM clicks ORDER BY created_at DESC LIMIT 1');
    const lastVisited = lastVisitedRes.rows.length > 0 ? lastVisitedRes.rows[0].created_at : null;
    
    return res.json({
      totalClicks,
      uniqueVisitors,
      activeLinks,
      popularLink,
      lastVisited
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// Chart Data (Clicks over time and referral distribution)
app.get('/api/analytics/charts', authenticateToken, async (req, res) => {
  try {
    // 1. Daily click statistics (last 14 days)
    const dailyClicksRes = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
        COUNT(*) AS clicks,
        COUNT(DISTINCT ip_address) AS unique_visitors
      FROM clicks
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY date
      ORDER BY date ASC
    `);
    
    // 2. Referral code click distribution
    const referralDistRes = await query(`
      SELECT 
        l.referral_code AS name,
        COUNT(c.id) AS value
      FROM links l
      LEFT JOIN clicks c ON l.id = c.link_id
      GROUP BY l.referral_code
      ORDER BY value DESC
    `);
    
    // 3. Device breakdown
    const deviceRes = await query(`
      SELECT 
        device AS name,
        COUNT(*) AS value
      FROM clicks
      GROUP BY device
      ORDER BY value DESC
    `);
    
    // 4. Browser breakdown
    const browserRes = await query(`
      SELECT 
        browser AS name,
        COUNT(*) AS value
      FROM clicks
      GROUP BY browser
      ORDER BY value DESC
    `);
    
    return res.json({
      dailyClicks: dailyClicksRes.rows.map(row => ({
        ...row,
        clicks: parseInt(row.clicks, 10),
        unique_visitors: parseInt(row.unique_visitors, 10)
      })),
      referralDistribution: referralDistRes.rows.map(row => ({
        ...row,
        value: parseInt(row.value, 10)
      })),
      deviceBreakdown: deviceRes.rows.map(row => ({
        ...row,
        value: parseInt(row.value, 10)
      })),
      browserBreakdown: browserRes.rows.map(row => ({
        ...row,
        value: parseInt(row.value, 10)
      }))
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Recent clicks log
app.get('/api/analytics/recent', authenticateToken, async (req, res) => {
  try {
    const recentClicksRes = await query(`
      SELECT 
        c.id,
        c.ip_address,
        c.device,
        c.browser,
        c.created_at,
        l.referral_code,
        l.destination_url
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      ORDER BY c.created_at DESC
      LIMIT 20
    `);
    
    return res.json(recentClicksRes.rows);
  } catch (error) {
    console.error('Error fetching recent clicks:', error);
    return res.status(500).json({ error: 'Failed to fetch recent clicks' });
  }
});

// Server Status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const dbCheck = await query('SELECT 1');
    return res.json({
      status: 'healthy',
      database: dbCheck.rows.length > 0 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`ReferralLink Express Server running on port ${PORT}`);
  console.log(`Short links base URL configured as: ${SHORT_LINK_BASE_URL}/:referral_code`);
  console.log(`==================================================\n`);
});
