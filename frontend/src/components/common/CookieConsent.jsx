import React, { useState, useEffect } from 'react';
import { Cookie, Shield, Check, X, Sliders } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true
  });

  useEffect(() => {
    const savedConsent = localStorage.getItem('sm_cookie_consent');
    if (!savedConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('sm_cookie_consent', JSON.stringify({ essential: true, analytics: true, timestamp: Date.now() }));
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('sm_cookie_consent', JSON.stringify({ ...preferences, essential: true, timestamp: Date.now() }));
    setShowBanner(false);
    setShowPreferences(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Non-intrusive bottom banner */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:max-w-xl z-[99998] bg-slate-950 text-white p-5 rounded-3xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4 space-y-3.5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              Privacy & Cookie Notice
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              We use essential cookies and secure local storage to keep your student account signed in and enable offline study. Read our{' '}
              <Link to="/cookie-policy" className="text-indigo-400 font-semibold underline">
                Cookie Policy
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" className="text-indigo-400 font-semibold underline">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
          <button
            onClick={() => setShowPreferences(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Sliders className="w-3.5 h-3.5" /> Preferences
          </button>

          <button
            onClick={handleAcceptAll}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Accept All
          </button>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" /> Cookie Preferences
              </h3>
              <button onClick={() => setShowPreferences(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Essential */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block">Strictly Necessary Storage</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Authentication token, student profile cache, and offline notes.</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Always Active
                </span>
              </div>

              {/* Analytics */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block">Learning Analytics</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Helps us analyze video playback speed and test engine completion rates.</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={e => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={handleSavePreferences}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
