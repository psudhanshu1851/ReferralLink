import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Sparkles, Copy, Download, ArrowLeft, ArrowRight, QrCode } from 'lucide-react';

export default function CreateLink({ token }) {
  const [destinationUrl, setDestinationUrl] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  const handleCleanReferral = (val) => {
    // Keep letters, numbers, hyphens, and underscores only
    const clean = val.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    setReferralCode(clean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessData(null);
    setCopied(false);

    if (!destinationUrl) {
      setError('Destination URL is required');
      return;
    }

    if (!referralCode) {
      setError('Referral code is required');
      return;
    }

    // Format destination URL if needed
    let formattedUrl = destinationUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          destination_url: formattedUrl,
          referral_code: referralCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessData(data);
      } else {
        setError(data.error || 'Failed to create referral link');
      }
    } catch (err) {
      console.error(err);
      setError('Server connection error. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!successData) return;
    const shortUrl = `${window.location.protocol}//${window.location.hostname}:5000/r/${successData.referral_code}`;
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!successData) return;
    const link = document.createElement('a');
    link.href = successData.qr_image;
    link.download = `referrallink-${successData.referral_code}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewShortUrl = `${window.location.protocol}//${window.location.hostname}:5000/r/${referralCode || '[referral_code]'}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-8">
        {!successData ? (
          // Form View
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Referral Short Link</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter your destination URL and define a custom short identifier. We will generate a unique tracked URL and QR code.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="destination">
                  Destination URL
                </label>
                <input
                  id="destination"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  placeholder="e.g. theraav.in/register or https://example.com/promo"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                />
                <span className="text-xs text-slate-400 mt-1.5 block">
                  The final target page where visitors will be instantly redirected.
                </span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="referral">
                  Referral Identifier (Custom Code)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400 font-semibold text-sm">/</span>
                  <input
                    id="referral"
                    type="text"
                    required
                    className="w-full pl-7 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-semibold text-slate-700"
                    placeholder="e.g. ankit, instagram, campaignA"
                    value={referralCode}
                    onChange={(e) => handleCleanReferral(e.target.value)}
                  />
                </div>
                <span className="text-xs text-slate-400 mt-1.5 block">
                  Only lowercase letters, numbers, hyphens, and underscores are allowed.
                </span>
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-100 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Link Preview</span>
                <span className="text-sm font-bold text-indigo-700 break-all select-all">
                  {previewShortUrl}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating assets...
                  </>
                ) : (
                  <>
                    Generate Link & QR <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          // Success View
          <div className="text-center space-y-6 py-4 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Referral Link Created!</h2>
              <p className="text-sm text-slate-500 mt-1">
                Your custom link and QR code were generated successfully.
              </p>
            </div>

            {/* Link detail preview card */}
            <div className="bg-slate-50 border border-slate-200/50 p-6 rounded-2xl max-w-md mx-auto space-y-4">
              {/* Short link row */}
              <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-800 truncate select-all">
                  {`${window.location.protocol}//${window.location.hostname}:5000/r/${successData.referral_code}`}
                </span>
                <button
                  onClick={handleCopy}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    copied
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* QR Image display */}
              <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 inline-block">
                <img src={successData.qr_image} alt="Generated QR Code" className="w-44 h-44 object-contain mx-auto" />
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download QR
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Dashboard
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessData(null);
                setDestinationUrl('');
                setReferralCode('');
              }}
              className="text-sm font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              Create another link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
