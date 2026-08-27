import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getAllOfflineItems,
  getOfflineItemBlobUrl,
  removeOfflineItem,
  clearAllOfflineVault,
  getOfflineStorageUsage
} from '../../utils/offlineStorage';
import {
  WifiOff,
  Wifi,
  FolderDown,
  FileText,
  Video,
  Play,
  Trash2,
  HardDrive,
  Shield,
  Search,
  BookOpen,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Lock,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';

export function OfflinePortal() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ formatted: '0 MB', count: 0 });
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // In-App DRM Player & Reader Modal States
  const [activeOfflineDoc, setActiveOfflineDoc] = useState(null); // { item, blobUrl }
  const [activeOfflineVideo, setActiveOfflineVideo] = useState(null); // { item, blobUrl }

  const loadOfflineVault = async () => {
    setLoading(true);
    try {
      const [list, storageInfo] = await Promise.all([
        getAllOfflineItems(),
        getOfflineStorageUsage()
      ]);
      setItems(list || []);
      setUsage(storageInfo || { formatted: '0 MB', count: 0 });
    } catch (err) {
      console.error('Load offline vault error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfflineVault();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOpenOfflineItem = async (item) => {
    try {
      const { blobUrl } = await getOfflineItemBlobUrl(item.id);
      if (item.type === 'recording') {
        setActiveOfflineVideo({ item, blobUrl });
      } else {
        setActiveOfflineDoc({ item, blobUrl });
      }
    } catch (err) {
      error(err.message || 'Could not load offline item from local storage.');
    }
  };

  const handleDeleteItem = async (id, title) => {
    if (!window.confirm(`Delete "${title}" from your offline downloads?`)) return;
    try {
      await removeOfflineItem(id);
      success('Item removed from offline storage.');
      loadOfflineVault();
    } catch (err) {
      error('Failed to remove offline item.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Wipe all offline downloaded items? You will need internet to re-download them.')) return;
    try {
      await clearAllOfflineVault();
      success('Offline vault cleared.');
      loadOfflineVault();
    } catch (err) {
      error('Failed to clear vault.');
    }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.subject?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || item.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none font-sans"
    >
      {/* Top Standalone Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <FolderDown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                Success Mantra Offline Portal
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Offline Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              100% Local Sandboxed Storage • Zero WiFi / Data Required
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <Link
              to="/student/dashboard"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Wifi className="w-3.5 h-3.5" /> Back Online
            </Link>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono flex items-center gap-1.5">
              <WifiOff className="w-3 h-3 text-rose-400" /> Disconnected
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner with Storage Status */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 relative z-10">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Your Downloaded Content Vault
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/90 max-w-xl leading-relaxed">
              Watch your downloaded video lectures and read your study notes directly inside the app. Protected with Anti-Piracy DRM and student watermarks.
            </p>
          </div>

          <div className="relative z-10 bg-slate-950/70 border border-indigo-500/20 p-4 rounded-2xl flex flex-col justify-between min-w-[200px] shadow-inner">
            <div className="flex items-center justify-between text-xs text-indigo-300 mb-2">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> Local Space Used:
              </span>
              <strong className="text-white text-sm font-bold">{usage.formatted}</strong>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span>{usage.count} items ready offline</span>
              {usage.count > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer transition"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Security & Anti-Sharing Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>In-App Protected Storage:</strong> All files are encrypted and sandboxed within your browser vault. External downloading, file ripping, and sharing outside the app are disabled under digital copyright enforcement.
          </span>
        </div>

        {/* Filters & Search */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search downloaded lectures or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: 'All Downloaded', value: 'ALL' },
              { label: 'PDF Notes & Books', value: 'notes' },
              { label: 'Video Lectures', value: 'recording' }
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilterType(tab.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === tab.value
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Offline Items Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-400 font-medium">Opening local offline vault...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-3">
            <FolderDown className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <h3 className="font-bold text-white text-base">No downloaded content available offline</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                When you are online, click the <strong>"Save Offline (In-App)"</strong> button on any study notes or recorded lectures to make them available here anytime without internet!
              </p>
            </div>
            {isOnline && (
              <Link
                to="/student/notes"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md"
              >
                <BookOpen className="w-3.5 h-3.5" /> Browse & Save Study Materials
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const isVideo = item.type === 'recording';

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    {/* Visual Card / Thumbnail */}
                    <div
                      onClick={() => handleOpenOfflineItem(item)}
                      className="aspect-video rounded-2xl bg-black overflow-hidden relative group cursor-pointer border border-slate-800"
                    >
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-950 to-black flex flex-col items-center justify-center text-white p-4">
                          {isVideo ? (
                            <Video className="w-8 h-8 text-indigo-400 mb-1" />
                          ) : (
                            <FileText className="w-8 h-8 text-indigo-400 mb-1" />
                          )}
                          <span className="text-[11px] font-bold text-indigo-200 text-center line-clamp-1">
                            {item.subject}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition flex items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/90 group-hover:bg-indigo-600 text-slate-950 group-hover:text-white flex items-center justify-center shadow-lg transition transform group-hover:scale-110">
                          {isVideo ? <Play className="w-5 h-5 fill-current ml-0.5" /> : <Eye className="w-5 h-5" />}
                        </div>
                      </div>

                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-xs text-white font-mono text-[10px] font-bold">
                        {item.size_formatted}
                      </span>
                    </div>

                    {/* Category & Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase">
                        {item.target_class || 'Class 12'} • {item.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Offline Ready
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{item.subject}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenOfflineItem(item)}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      {isVideo ? <Play className="w-3.5 h-3.5 fill-current" /> : <Eye className="w-3.5 h-3.5" />}
                      {isVideo ? 'Watch Offline' : 'Read Offline'}
                    </button>

                    <button
                      type="button"
                      title="Remove from offline vault"
                      onClick={() => handleDeleteItem(item.id, item.title)}
                      className="p-2.5 rounded-xl bg-slate-950 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Offline DRM PDF In-App Reader Modal ── */}
      {activeOfflineDoc && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in select-none"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="h-14 px-5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-xs sm:text-sm truncate max-w-md">
                    {activeOfflineDoc.item.title}
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    In-App Sandboxed Reader • DRM Watermarked
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveOfflineDoc(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-black relative overflow-hidden flex items-center justify-center">
              {/* Dynamic Anti-Piracy Watermark */}
              <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col items-center justify-around opacity-15 rotate-[-25deg] overflow-hidden">
                <div className="text-base font-black text-white text-center">
                  LICENSED TO: {user?.name || 'STUDENT'} ({user?.phone || user?.email || 'OFFLINE ACCESS'})
                </div>
                <div className="text-base font-black text-white text-center">
                  SUCCESS MANTRA ACADEMY • OFFLINE DRM ENFORCED
                </div>
                <div className="text-base font-black text-white text-center">
                  UID: {user?.id || 'USR_SECURE'} • DO NOT SHARE
                </div>
              </div>

              <iframe
                src={`${activeOfflineDoc.blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                title={activeOfflineDoc.item.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Offline DRM Video Player Modal ── */}
      {activeOfflineVideo && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn select-none"
        >
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-800 space-y-4 p-5 sm:p-6 relative">
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>{activeOfflineVideo.item.title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                    Offline Local Stream
                  </span>
                </h3>
                <span className="text-xs text-indigo-400 font-medium">
                  {activeOfflineVideo.item.subject} • {activeOfflineVideo.item.target_class || 'Class 12'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveOfflineVideo(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onContextMenu={(e) => e.preventDefault()}
              className="aspect-video w-full rounded-2xl bg-black overflow-hidden relative shadow-inner"
            >
              {/* Dynamic Anti-Screen-Record Floating Watermark */}
              <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col items-center justify-around opacity-15 rotate-[-20deg] overflow-hidden">
                <div className="text-base font-black text-white text-center">
                  LICENSED TO: {user?.name || 'STUDENT'} ({user?.phone || user?.email || 'OFFLINE ACCESS'})
                </div>
                <div className="text-base font-black text-white text-center">
                  SUCCESS MANTRA ACADEMY • OFFLINE DRM ENFORCED
                </div>
                <div className="text-base font-black text-white text-center">
                  UID: {user?.id || 'USR_SECURE'}
                </div>
              </div>

              <video
                src={activeOfflineVideo.blobUrl}
                controls
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture={true}
                onContextMenu={(e) => e.preventDefault()}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
