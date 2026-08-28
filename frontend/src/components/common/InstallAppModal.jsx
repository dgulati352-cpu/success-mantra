import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Apple,
  Globe,
  Download,
  Share2,
  PlusSquare,
  Sparkles,
  CheckCircle2,
  Laptop,
  Check,
  ArrowDownCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

export function InstallAppModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState('android'); // 'android' | 'ios' | 'pc'
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroidDevice = /android/.test(userAgent);
      setIsIOS(isIosDevice);
      setIsAndroid(isAndroidDevice);

      if (isIosDevice) setActiveTab('ios');
      else if (isAndroidDevice) setActiveTab('android');
      else setActiveTab('android');

      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        setIsInstalled(true);
      }

      const handleBeforeInstall = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  if (!isOpen) return null;

  const handleAndroidInstall = async () => {
    setDownloadStarted(true);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (err) {
        console.log(err);
      }
      setDeferredPrompt(null);
    } else {
      // Direct fallback download
      const link = document.createElement('a');
      link.href = '/manifest.json';
      link.download = 'success-mantra-app.webmanifest';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 text-white shadow-2xl relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Download className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black text-white">Direct App Download</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" /> Free
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Download and launch Success Mantra directly on your phone or PC
            </p>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>Apple iOS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pc')}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pc'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Windows / Mac</span>
          </button>
        </div>

        {/* Tab 1: Android Direct Download */}
        {activeTab === 'android' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Success Mantra for Android</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                  v2.4 (Latest)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Install the official Android app directly through Google Chrome or any Android browser.
              </p>

              {/* Direct Download Button */}
              <button
                type="button"
                onClick={handleAndroidInstall}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowDownCircle className="w-5 h-5 text-slate-950" />
                <span>Download & Install for Android</span>
              </button>
            </div>

            {/* Quick Chrome Helper */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1 text-slate-400">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" /> Chrome One-Tap Option:
              </div>
              <p>
                In Chrome, tap the <strong>3 dots (⋮)</strong> top-right &gt; Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Apple iOS Direct Download */}
        {activeTab === 'ios' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-300 font-bold text-sm">
                  <Apple className="w-4 h-4 text-sky-400" />
                  <span>Success Mantra for iPhone & iPad</span>
                </div>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-mono">
                  iOS / Safari
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Directly download the Apple WebClip profile or install in 2 taps via Safari.
              </p>

              {/* Direct Profile Download */}
              <a
                href="/SuccessMantra-iOS.mobileconfig"
                download="SuccessMantra-iOS.mobileconfig"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-sky-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowDownCircle className="w-5 h-5 text-white" />
                <span>Direct Download iOS Profile (.mobileconfig)</span>
              </a>
            </div>

            {/* Step-by-step for Safari */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-sky-400" /> Or Instant 2-Tap in Safari:
              </div>
              <ol className="space-y-1.5 text-slate-400 pl-4 list-decimal text-[11px]">
                <li>Tap the <strong>Share</strong> button (⎋) at the bottom toolbar of Safari.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).</li>
                <li>Tap <strong>"Add"</strong> at top-right to launch from your home screen.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 3: Windows / Desktop Direct Download */}
        {activeTab === 'pc' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <Laptop className="w-4 h-4 text-indigo-400" />
                  <span>Success Mantra for Windows & Mac</span>
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                  Desktop
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Direct launcher for Windows 10/11 & macOS desktop app.
              </p>

              {/* Direct Desktop Download */}
              <a
                href="/SuccessMantra-Windows.url"
                download="SuccessMantra.url"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm shadow-lg shadow-indigo-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowDownCircle className="w-5 h-5 text-white" />
                <span>Direct Download Windows App Launcher</span>
              </a>
            </div>
          </div>
        )}

        {/* Feature Badges */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Direct 1-Click Launch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Full HD Live Stream</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Official & Safe (0 MB Bloat)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Auto-Sync LMS Notes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
