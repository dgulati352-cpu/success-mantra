import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getOfflineStorageUsage } from '../utils/offlineStorage';
import { WifiOff, Wifi, FolderDown, ArrowRight, X } from 'lucide-react';

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const checkOfflineCount = async () => {
    try {
      const usage = await getOfflineStorageUsage();
      setOfflineCount(usage.count || 0);
    } catch {
      setOfflineCount(0);
    }
  };

  useEffect(() => {
    checkOfflineCount();

    const handleOnline = () => {
      setIsOffline(false);
      setBannerDismissed(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setBannerDismissed(false);
      checkOfflineCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isCurrentPageOfflinePortal = location.pathname === '/offline';

  return (
    <OfflineContext.Provider value={{ isOffline, offlineCount, refreshOfflineCount: checkOfflineCount }}>
      {children}

      {/* Floating Offline Notification Banner */}
      {isOffline && !isCurrentPageOfflinePortal && !bannerDismissed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[99999] animate-bounce-short">
          <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
                <WifiOff className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>No Internet Connection</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {offlineCount > 0
                    ? `You have ${offlineCount} items saved in your Offline Vault.`
                    : 'Access your local saved lectures & notes.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/offline')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-black transition flex items-center gap-1 shadow-md cursor-pointer"
              >
                <span>Offline Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext) || { isOffline: false, offlineCount: 0, refreshOfflineCount: () => {} };
}
