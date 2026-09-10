import React, { useState, useEffect } from 'react';
import { recordingUploadService } from '../../services/recordingUploadService';
import { CloudUpload, RefreshCw, X, CheckCircle2, AlertCircle, Pause, Play } from 'lucide-react';

export function PendingUploadsBanner() {
  const [pending, setPending] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isResuming, setIsResuming] = useState({});

  const checkPending = async () => {
    try {
      const list = await recordingUploadService.recoverPendingUploads();
      setPending(list || []);
    } catch (e) {
      console.warn('[PendingUploadsBanner] Check error:', e);
    }
  };

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 8000);
    return () => clearInterval(interval);
  }, []);

  if (pending.length === 0) return null;

  const handleResume = async (rec) => {
    setIsResuming(prev => ({ ...prev, [rec.classId]: true }));
    try {
      await recordingUploadService.resumeUpload(rec.classId, {
        onProgress: (prog) => {
          setUploadProgress(prev => ({
            ...prev,
            [rec.classId]: prog
          }));
        },
        onStatusChange: (status) => {
          if (status === 'published') {
            checkPending();
          }
        },
        onSuccess: () => {
          checkPending();
        },
        onError: (err) => {
          console.error('[PendingUpload] Resume error:', err);
        }
      });
    } catch (err) {
      console.error('[PendingUpload] Failed to resume:', err);
    } finally {
      setIsResuming(prev => ({ ...prev, [rec.classId]: false }));
    }
  };

  const handleCancel = async (classId) => {
    if (window.confirm('Are you sure you want to discard this un-uploaded recording?')) {
      await recordingUploadService.cancelUpload(classId);
      checkPending();
    }
  };

  return (
    <aside
      aria-label="Pending lecture recordings"
      className="fixed bottom-6 right-6 z-[9999] max-w-md w-full bg-slate-900/95 border border-indigo-500/40 rounded-3xl p-5 shadow-2xl text-white backdrop-blur-md animate-fadeIn space-y-3"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <CloudUpload className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
              <span>Pending Recording Uploads</span>
              <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                {pending.length}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">Safely saved in local recovery storage.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {pending.map(rec => {
          const prog = uploadProgress[rec.classId];
          const pct = prog ? prog.percent : Math.round(((rec.uploadedBytes || 0) / (rec.fileSize || 1)) * 100);
          const sizeMB = (rec.fileSize / (1024 * 1024)).toFixed(1);
          const uploadedMB = ((prog ? prog.uploadedBytes : rec.uploadedBytes || 0) / (1024 * 1024)).toFixed(1);

          return (
            <div key={rec.classId} className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h5 className="font-bold text-xs text-slate-200 truncate">{rec.title}</h5>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    {uploadedMB} MB / {sizeMB} MB ({pct}%)
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleResume(rec)}
                    disabled={isResuming[rec.classId]}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResuming[rec.classId] ? 'animate-spin' : ''}`} />
                    <span>{isResuming[rec.classId] ? 'Resuming...' : 'Resume'}</span>
                  </button>
                  <button
                    onClick={() => handleCancel(rec.classId)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition cursor-pointer"
                    title="Discard local recording"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
export default PendingUploadsBanner;
