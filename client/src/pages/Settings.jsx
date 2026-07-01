import React, { useState, useEffect } from 'react';
import { Database, ShieldAlert, CheckCircle, RefreshCw, Server, HelpCircle, HardDrive } from 'lucide-react';

export default function Settings({ token }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const checkSystemStatus = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
      setError('Failed to verify backend server status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      {/* 1. Connection Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Infrastructure Connection Status
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time status of backend service layers and PostgreSQL connection.</p>
          </div>
          <button 
            onClick={checkSystemStatus}
            disabled={loading}
            className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
          </button>
        </div>

        {error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Express Server */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 shadow-sm">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Express Server</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">Active / Running</p>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>

            {/* PostgreSQL DB */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 shadow-sm">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">PostgreSQL DB</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                    {status?.database === 'connected' ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
              {status?.database === 'connected' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-500" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Credentials Config Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Admin Account Properties</h2>
          <p className="text-xs text-slate-400 mt-0.5">Authentication profiles configured on startup.</p>
        </div>
        <div className="space-y-3.5 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500 font-medium">Authentication Type</span>
            <span className="font-bold text-slate-800">JSON Web Token (JWT)</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500 font-medium">Session Duration</span>
            <span className="font-bold text-slate-800">7 Days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Database Host config</span>
            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5">
              DATABASE_URL
            </span>
          </div>
        </div>
      </div>

      {/* 3. Documentation/Help Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-600" />
          Technical Architecture Reference
        </h2>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            <strong>URL Redirection:</strong> Whenever a visitor loads a link pointing to <code>/r/:referral_code</code> on the server, Express queries the matching database entry, extracts the destination URL, parses the user agent for device and browser category statistics, and issues an instant <code>302 Found</code> HTTP redirect headers package.
          </p>
          <p>
            <strong>QR Code Encoding:</strong> Standard high-density QR assets are rendered utilizing error correction levels optimized for high readability. These codes contain the target referral link path directly.
          </p>
          <p>
            <strong>Analytics:</strong> Traffic data aggregation (e.g., clicks and unique visitor counts) is evaluated directly within database operations using fast <code>COUNT(DISTINCT ip_address)</code> aggregates, ensuring the charts load instantly even under heavy volume.
          </p>
        </div>
      </div>
    </div>
  );
}
