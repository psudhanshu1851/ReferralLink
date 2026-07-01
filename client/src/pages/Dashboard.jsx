import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Copy, Download, Trash2, ExternalLink, RefreshCw, QrCode, Sparkles, UserCheck, Calendar } from 'lucide-react';

export default function Dashboard({ token }) {
  const [links, setLinks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const navigate = useNavigate();

  const fetchData = async () => {
    setError('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch links list
      const linksRes = await fetch('/api/links', { headers });
      if (!linksRes.ok) throw new Error('Failed to load links');
      const linksData = await linksRes.json();
      setLinks(linksData);

      // Fetch analytics summary
      const analyticsRes = await fetch('/api/analytics', { headers });
      if (!analyticsRes.ok) throw new Error('Failed to load analytics overview');
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);
      
    } catch (err) {
      console.error(err);
      setError('Could not retrieve dashboard data. Please verify database connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCopyLink = (referralCode, linkId) => {
    // Generate server link
    // Normally uses location.host but we use the configured server port 5000 redirection endpoint directly
    const shortUrl = `${window.location.protocol}//${window.location.hostname}:5000/r/${referralCode}`;
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadQR = (qrBase64, referralCode) => {
    const link = document.createElement('a');
    link.href = qrBase64;
    link.download = `referrallink-${referralCode}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteLink = async (id) => {
    try {
      const response = await fetch(`/api/links/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setLinks(links.filter(link => link.id !== id));
        // Refresh analytics summary
        fetchData();
        setDeleteConfirmId(null);
      } else {
        alert('Failed to delete the link');
      }
    } catch (err) {
      console.error(err);
      alert('Error occurred while deleting link.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
          <span className="text-slate-500 font-medium">Loading Dashboard Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Alert Header if error */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-sm font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="px-3 py-1 bg-white border border-amber-200 hover:bg-amber-100 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* 1. Metrics Cards at Top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Clicks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Clicks</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-2">
              {analytics?.totalClicks?.toLocaleString() || 0}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Aggregated campaigns traffic</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Unique Visitors */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unique Visitors</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-2">
              {analytics?.uniqueVisitors?.toLocaleString() || 0}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Based on distinct IP addresses</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Most Popular Link */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Referral</p>
            <h3 className="text-lg font-bold text-slate-800 mt-3 truncate max-w-[150px]">
              {analytics?.popularLink ? `/r/${analytics.popularLink.referral_code}` : 'None Yet'}
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              {analytics?.popularLink ? `${analytics.popularLink.clicks} clicks recorded` : 'Create link to start tracking'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Last Visit */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Tracked Click</p>
            <h3 className="text-sm font-semibold text-slate-800 mt-4 leading-relaxed">
              {analytics?.lastVisited ? formatDate(analytics.lastVisited) : 'Never'}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">Real-time tracker activity</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Main Dashboard Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        {/* Table Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tracked Referral Links</h2>
            <p className="text-sm text-slate-500 mt-0.5">List of active referral links and quick action controls.</p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-md shadow-indigo-50 flex items-center gap-1.5 cursor-pointer"
          >
            Create Referral Link
          </button>
        </div>

        {/* Table Body */}
        {links.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-700">No Referral Links Yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Create your first tracked link to starts generating QR codes and monitoring analytics campaigns.
            </p>
            <button
              onClick={() => navigate('/create')}
              className="mt-5 py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-semibold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Referral Code</th>
                  <th className="py-4 px-6">Destination / Short Link</th>
                  <th className="py-4 px-6 text-center">Clicks</th>
                  <th className="py-4 px-6 text-center">Unique Visitors</th>
                  <th className="py-4 px-6 text-center">QR Code</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {links.map((link) => {
                  const shortUrl = `${window.location.protocol}//${window.location.hostname}:5000/r/${link.referral_code}`;
                  return (
                    <tr key={link.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Code */}
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 bg-slate-100 py-1 px-2.5 rounded-lg border border-slate-200/50">
                          /{link.referral_code}
                        </span>
                      </td>
                      {/* Destination / Short Link */}
                      <td className="py-4 px-6 max-w-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-800 truncate block select-all">
                            {shortUrl}
                          </span>
                          <span className="text-xs text-slate-400 truncate block" title={link.destination_url}>
                            to: {link.destination_url}
                          </span>
                        </div>
                      </td>
                      {/* Click counts */}
                      <td className="py-4 px-6 text-center font-bold text-slate-800">
                        {link.clicks.toLocaleString()}
                      </td>
                      {/* Unique Visitors */}
                      <td className="py-4 px-6 text-center font-semibold text-slate-500">
                        {link.unique_visitors.toLocaleString()}
                      </td>
                      {/* QR Thumbnail */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center">
                          <div 
                            onClick={() => handleDownloadQR(link.qr_image, link.referral_code)}
                            className="w-10 h-10 border border-slate-200 rounded-lg p-0.5 bg-white cursor-pointer hover:border-indigo-400 hover:scale-105 transition-all shadow-sm group relative"
                            title="Click to download QR Code"
                          >
                            <img src={link.qr_image} alt="QR Thumbnail" className="w-full h-full object-contain rounded-md" />
                            <div className="absolute inset-0 bg-slate-900/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Download className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Actions buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy Link */}
                          <button
                            onClick={() => handleCopyLink(link.referral_code, link.id)}
                            className={`p-2 rounded-xl border transition-all ${
                              copiedId === link.id
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium text-xs px-3'
                                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                            }`}
                            title="Copy Short URL"
                          >
                            {copiedId === link.id ? 'Copied!' : <Copy className="w-4 h-4" />}
                          </button>
                          
                          {/* Download QR */}
                          <button
                            onClick={() => handleDownloadQR(link.qr_image, link.referral_code)}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors"
                            title="Download QR PNG"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* View Analytics */}
                          <button
                            onClick={() => navigate('/analytics', { state: { filterReferral: link.referral_code } })}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                            title="View Link Analytics"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          {deleteConfirmId === link.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteLink(link.id)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(link.id)}
                              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                              title="Delete Link"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
