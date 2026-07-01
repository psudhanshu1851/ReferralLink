import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, Laptop, Smartphone, Tablet, Globe, Calendar, Filter, Eye } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#64748b'];

export default function Analytics({ token }) {
  const location = useLocation();
  const initialFilter = location.state?.filterReferral || 'all';

  const [filterCode, setFilterCode] = useState(initialFilter);
  const [chartsData, setChartsData] = useState(null);
  const [recentClicks, setRecentClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalyticsData = async () => {
    setError('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch charts
      const chartsRes = await fetch('/api/analytics/charts', { headers });
      if (!chartsRes.ok) throw new Error('Failed to load chart data');
      const chartsJson = await chartsRes.json();
      setChartsData(chartsJson);

      // Fetch recent clicks log
      const recentRes = await fetch('/api/analytics/recent', { headers });
      if (!recentRes.ok) throw new Error('Failed to load recent clicks');
      const recentJson = await recentRes.json();
      setRecentClicks(recentJson);

    } catch (err) {
      console.error(err);
      setError('Could not retrieve analytics. Please verify backend state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [token]);

  // Derived filtered data depending on the dropdown filter
  const getFilteredLineData = () => {
    if (!chartsData) return [];
    // Currently, daily clicks are aggregated globally at backend. 
    // For a detailed filtered view, we can filter our recentClicks or keep global daily charts.
    // If filterCode is 'all', return all.
    // To make it feel interactive, if filterCode is specified, we can compute daily clicks from recentClicks for that code!
    if (filterCode === 'all') {
      return chartsData.dailyClicks;
    }
    
    // Compute daily clicks for the filtered referral code from recentClicks
    const dailyMap = {};
    recentClicks
      .filter(click => click.referral_code === filterCode)
      .forEach(click => {
        const date = new Date(click.created_at).toISOString().split('T')[0];
        if (!dailyMap[date]) {
          dailyMap[date] = { date, clicks: 0, unique_visitors: 0, ips: new Set() };
        }
        dailyMap[date].clicks += 1;
        dailyMap[date].ips.add(click.ip_address);
      });
      
    return Object.values(dailyMap)
      .map(d => ({
        date: d.date,
        clicks: d.clicks,
        unique_visitors: d.ips.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const getFilteredPieData = () => {
    if (!chartsData) return [];
    if (filterCode === 'all') {
      return chartsData.referralDistribution.filter(item => item.value > 0);
    }
    return chartsData.referralDistribution.filter(item => item.name === filterCode);
  };

  const getFilteredRecentClicks = () => {
    if (filterCode === 'all') return recentClicks;
    return recentClicks.filter(c => c.referral_code === filterCode);
  };

  const getFilteredDeviceData = () => {
    if (!chartsData) return [];
    if (filterCode === 'all') return chartsData.deviceBreakdown;
    
    // Compute device breakdown for specific code from recentClicks
    const devMap = {};
    recentClicks
      .filter(click => click.referral_code === filterCode)
      .forEach(c => {
        devMap[c.device] = (devMap[c.device] || 0) + 1;
      });
    return Object.entries(devMap).map(([name, value]) => ({ name, value }));
  };

  const getFilteredBrowserData = () => {
    if (!chartsData) return [];
    if (filterCode === 'all') return chartsData.browserBreakdown;
    
    // Compute browser breakdown for specific code from recentClicks
    const browserMap = {};
    recentClicks
      .filter(click => click.referral_code === filterCode)
      .forEach(c => {
        browserMap[c.browser] = (browserMap[c.browser] || 0) + 1;
      });
    return Object.entries(browserMap).map(([name, value]) => ({ name, value }));
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceIcon = (device) => {
    switch (device?.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-4 h-4 text-emerald-500" />;
      case 'tablet': return <Tablet className="w-4 h-4 text-amber-500" />;
      default: return <Laptop className="w-4 h-4 text-indigo-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
          <span className="text-slate-500 font-medium">Gathering Analytics Profiles...</span>
        </div>
      </div>
    );
  }

  // Get unique list of referral codes for dropdown selector
  const referralList = chartsData?.referralDistribution.map(item => item.name) || [];
  const lineData = getFilteredLineData();
  const pieData = getFilteredPieData();
  const deviceData = getFilteredDeviceData();
  const browserData = getFilteredBrowserData();
  const filteredClicks = getFilteredRecentClicks();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Analytics Filter Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
            <Filter className="w-4.5 h-4.5 text-indigo-600" />
            Filter Campaign Traffic
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Toggle filter to show global aggregated statistics or code specific clicks.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterCode}
            onChange={(e) => setFilterCode(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Campaigns (Global)</option>
            {referralList.map(code => (
              <option key={code} value={code}>/{code}</option>
            ))}
          </select>
          <button 
            onClick={fetchAnalyticsData}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Line Chart: Clicks over Time */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Clicks & Unique Visitors Over Time</h3>
            <p className="text-xs text-slate-400">Chronological daily distribution profile.</p>
          </div>
          <div className="h-72 w-full text-xs font-semibold text-slate-500">
            {lineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                No click events logged for this timeframe.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} dy={10} />
                  <YAxis tickLine={false} axisLine={false} dx={-5} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line type="monotone" dataKey="clicks" name="Total Clicks" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} dot={false} />
                  <Line type="monotone" dataKey="unique_visitors" name="Unique Visitors" stroke="#10b981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie Chart: Referral Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4 flex flex-col">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Campaign Contribution</h3>
            <p className="text-xs text-slate-400">Share of clicks across active codes.</p>
          </div>
          <div className="h-56 w-full flex-1 relative flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-slate-400 text-xs">No referrals recorded.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Custom Legends list */}
          <div className="max-h-24 overflow-y-auto space-y-1.5 text-xs font-semibold text-slate-600 pr-1">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="truncate max-w-[120px]">/{item.name}</span>
                </div>
                <span>{item.value} clicks ({Math.round(item.value / (pieData.reduce((a, b) => a + b.value, 0) || 1) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Device & Browser Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Device breakdown card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-slate-500" />
            Device Profiles
          </h3>
          <div className="space-y-3.5">
            {deviceData.length === 0 ? (
              <p className="text-xs text-slate-400">No device logs available.</p>
            ) : (
              deviceData.map((item) => {
                const total = deviceData.reduce((acc, curr) => acc + curr.value, 0);
                const percent = Math.round((item.value / total) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        {getDeviceIcon(item.name)}
                        {item.name}
                      </span>
                      <span>{item.value} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Browser breakdown card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-slate-500" />
            User Browsers
          </h3>
          <div className="space-y-3.5">
            {browserData.length === 0 ? (
              <p className="text-xs text-slate-400">No browser logs available.</p>
            ) : (
              browserData.map((item) => {
                const total = browserData.reduce((acc, curr) => acc + curr.value, 0);
                const percent = Math.round((item.value / total) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{item.name}</span>
                      <span>{item.value} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Recent Clicks Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Eye className="w-4.5 h-4.5 text-indigo-600" />
            Recent Visits Audit Log
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Real-time sequence of redirect clicks tracked.</p>
        </div>

        {filteredClicks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">
            No tracked click events found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-semibold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Referral Code</th>
                  <th className="py-4 px-6">IP Address</th>
                  <th className="py-4 px-6">Device</th>
                  <th className="py-4 px-6">Browser</th>
                  <th className="py-4 px-6">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                {filteredClicks.map((click) => (
                  <tr key={click.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-slate-800 font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(click.created_at)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 bg-slate-100 py-0.5 px-2 rounded border border-slate-200/50">
                        /{click.referral_code}
                      </span>
                    </td>
                    <td className="py-4 px-6 select-all font-mono">{click.ip_address}</td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-1">
                        {getDeviceIcon(click.device)}
                        {click.device}
                      </span>
                    </td>
                    <td className="py-4 px-6">{click.browser}</td>
                    <td className="py-4 px-6 max-w-xs truncate text-slate-400" title={click.destination_url}>
                      {click.destination_url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
