import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribeToInstallPrompt, promptAppInstall } from '../../utils/pwaInstall';
import { useToast } from '../../context/ToastContext';
import {
  Download,
  Smartphone,
  Laptop,
  GraduationCap,
  ShieldCheck,
  Radio,
  BookOpen,
  FolderDown,
  Sparkles,
  CheckCircle2,
  Apple,
  Globe,
  ArrowRight,
  Monitor,
  Check,
  ExternalLink
} from 'lucide-react';

export function AppDownload() {
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'faculty');
  const [canInstall, setCanInstall] = useState(false);
  const [installingStudent, setInstallingStudent] = useState(false);
  const [installingAdmin, setInstallingAdmin] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    return subscribeToInstallPrompt((available) => {
      setCanInstall(available);
    });
  }, []);

  const handleInstall = async (type) => {
    if (type === 'student') setInstallingStudent(true);
    if (type === 'admin') setInstallingAdmin(true);

    try {
      const installed = await promptAppInstall(type);
      if (installed) {
        success(`${type === 'student' ? 'Student App' : 'Admin Studio App'} installed successfully! Check your home screen / desktop.`);
      } else {
        // Show manual instruction modal or banner
        alert(
          `To install the ${type === 'student' ? 'Student App' : 'Admin Studio'}:\n\n` +
          `• On Windows/Mac (Chrome/Edge): Click the Install icon in the address bar or browser menu > "Install Success Mantra".\n` +
          `• On Android: Tap the 3 dots in Chrome > "Install App" or "Add to Home screen".\n` +
          `• On iPhone/iPad: Tap the Share button in Safari > "Add to Home Screen".`
        );
      }
    } catch (err) {
      console.error('Install error:', err);
    } finally {
      setInstallingStudent(false);
      setInstallingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans select-none">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Standalone Multi-Platform Applications
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Download Success Mantra App
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Install the dedicated standalone desktop and mobile app for seamless live classes, offline lecture vault, and study notes.
          </p>
        </div>

        {/* App Cards: Student App (and Admin App only if logged in as Admin) */}
        <div className={`grid gap-8 ${isAdmin ? 'grid-cols-1 lg:grid-cols-2' : 'max-w-2xl mx-auto grid-cols-1'}`}>
          {/* 1. STUDENT APP CARD */}
          <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold font-mono">
                  For Students
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white">Student Classroom App</h2>
                <p className="text-xs text-indigo-200 mt-1">
                  Full student portal with offline video replays, DRM-protected notes, and live classroom streams.
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-indigo-900/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>100% Offline Vault:</strong> Download lectures & notes to study with zero internet.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>Live Classrooms:</strong> Interactive WebRTC live streams with real-time doubt chat.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>Homework Submissions:</strong> Upload handwritten solutions with cloud sync.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>DRM Copyright Protected:</strong> Dynamic watermarking on all materials.</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800 relative z-10">
              <button
                type="button"
                onClick={() => handleInstall('student')}
                disabled={installingStudent}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {installingStudent ? 'Launching Installer...' : 'Install Student App'}
              </button>

              <Link
                to="/student/dashboard"
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 transition flex items-center justify-center gap-1.5"
              >
                <span>Launch in Browser</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 2. ADMIN STUDIO APP CARD (Visible only to Admin & Faculty) */}
          {isAdmin && (
            <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-emerald-400 shadow-xl">
                    <Radio className="w-8 h-8 animate-pulse" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
                    For Admin & Faculty
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white">Admin Command & Broadcaster Studio</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Dedicated broadcasting console, auto-recording publisher, student management, and ERP analytics.
                  </p>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Live Broadcaster Studio:</strong> WebRTC low-latency streaming with screen-share.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Auto-Recording Engine:</strong> Automatic live class capture to Firebase Cloud Storage.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Student & Order ERP:</strong> Enrollments, coupon codes, and revenue tracking.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Content Management:</strong> Upload and publish PDF notes & video lectures.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800 relative z-10">
                <button
                  type="button"
                  onClick={() => handleInstall('admin')}
                  disabled={installingAdmin}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white font-extrabold text-sm border border-slate-600 shadow-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  {installingAdmin ? 'Launching Installer...' : 'Install Admin Studio App'}
                </button>

                <Link
                  to="/admin/dashboard"
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 transition flex items-center justify-center gap-1.5"
                >
                  <span>Launch Admin Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Step-by-Step Installation Guides */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-white">How to Install on Any Device</h3>
            <p className="text-xs text-slate-400">
              Success Mantra Apps work seamlessly on Windows, macOS, Android, and iOS Safari.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Windows */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Monitor className="w-4 h-4" /> Windows (Chrome/Edge)
              </div>
              <p className="text-slate-400">
                Click the <strong>Install</strong> icon in your browser URL bar or tap the install buttons above.
              </p>
            </div>

            {/* Android */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Smartphone className="w-4 h-4" /> Android (Chrome)
              </div>
              <p className="text-slate-400">
                Tap the 3 dots menu in Chrome &gt; select <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong>.
              </p>
            </div>

            {/* iOS Safari */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-sky-400 font-bold">
                <Apple className="w-4 h-4" /> iPhone & iPad (Safari)
              </div>
              <p className="text-slate-400">
                Tap the <strong>Share</strong> button (box with up arrow) in Safari &gt; select <strong>"Add to Home Screen"</strong>.
              </p>
            </div>

            {/* macOS */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <Laptop className="w-4 h-4" /> macOS (Chrome/Safari)
              </div>
              <p className="text-slate-400">
                In Chrome, click the Install App icon in the address bar. In Safari, File &gt; <strong>"Add to Dock"</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
