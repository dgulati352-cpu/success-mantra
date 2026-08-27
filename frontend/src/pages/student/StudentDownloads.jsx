import React, { useState, useEffect } from 'react';
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
  Lock
} from 'lucide-react';

export function StudentDownloads() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ formatted: '0 MB', count: 0 });
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  // DRM In-App Player & Reader States
  const [activeOfflineDoc, setActiveOfflineDoc] = useState(null); // { item, blobUrl }
  const [activeOfflineVideo, setActiveOfflineVideo] = useState(null); // { item, blobUrl }

  const loadOfflineVault = async () => {
    setLoading(true);
    try {
      const [list, storageInfo] = await Promise.all([
        getAllOfflineItems(),
        getOfflineStorageUsage()
      ]);
      setItems(list);
      setUsage(storageInfo);
    } catch (err) {
      console.error('Load offline vault error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfflineVault();
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
      error(err.message || 'Could not open offline file.');
    }
  };

  const handleDeleteItem = async (id, title) => {
    if (!window.confirm(`Remove "${title}" from your offline downloads?`)) return;
    try {
      await removeOfflineItem(id);
      success('Item removed from offline storage.');
      loadOfflineVault();
    } catch (err) {
      error('Failed to delete item.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all offline downloads from your device? You will need an active internet connection to download them again.')) return;
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
    <div className="space-y-6 max-w-7xl mx-auto select-none pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <FolderDown className="w-3.5 h-3.5" /> In-App Offline Vault
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Offline Downloads</h1>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
            Access your saved study materials, notes, and recorded classes anytime without active internet. Protected with sandboxed In-App DRM.
          </p>
        </div>

        {/* Storage Meter Widget */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col justify-between min-w-[200px]">
          <div className="flex items-center justify-between text-xs text-indigo-200 mb-2">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> Vault Storage Used:
            </span>
            <strong className="text-white text-sm">{usage.formatted}</strong>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-[11px] text-indigo-300 font-medium">{usage.count} items saved</span>
            {usage.count > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[10px] text-rose-300 hover:text-rose-100 underline font-bold cursor-pointer transition"
              >
                Clear Vault
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security & Anti-Sharing Notice */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-950 text-xs flex items-center gap-3">
        <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
        <div>
          <strong className="font-bold">Sandboxed In-App Only Access:</strong> All saved items reside safely inside your browser's private offline storage. Direct exporting, file sharing, and external saving are restricted under digital copyright enforcement.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search saved offline notes or classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: 'All Items', value: 'ALL' },
            { label: 'Study Notes & PDFs', value: 'notes' },
            { label: 'Recorded Lectures', value: 'recording' }
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterType(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === tab.value
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items List / Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Opening offline vault...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 space-y-3">
          <FolderDown className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 text-base">No offline downloads found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              You haven't saved any content offline yet. Click the <strong>"Save Offline (In-App)"</strong> button on any Study Notes or Recorded Classes to access them without internet!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isVideo = item.type === 'recording';

            return (
              <div
                key={item.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Visual Header / Thumbnail */}
                  <div
                    onClick={() => handleOpenOfflineItem(item)}
                    className="aspect-video rounded-2xl bg-slate-950 overflow-hidden relative group cursor-pointer"
                  >
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-950 flex flex-col items-center justify-center text-white p-4">
                        {isVideo ? <Video className="w-8 h-8 text-indigo-400 mb-1" /> : <FileText className="w-8 h-8 text-indigo-400 mb-1" />}
                        <span className="text-[11px] font-bold text-indigo-200 text-center line-clamp-1">{item.subject}</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition flex items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/90 group-hover:bg-indigo-600 text-slate-900 group-hover:text-white flex items-center justify-center shadow-lg transition transform group-hover:scale-110">
                        {isVideo ? <Play className="w-5 h-5 fill-current ml-0.5" /> : <Eye className="w-5 h-5" />}
                      </div>
                    </div>

                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white font-mono text-[10px] font-bold">
                      {item.size_formatted}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                      {item.target_class || 'Class 12'}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready Offline
                    </span>
                  </div>

                  {/* Title & Info */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{item.subject}</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenOfflineItem(item)}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isVideo ? <Play className="w-3.5 h-3.5 fill-current" /> : <Eye className="w-3.5 h-3.5" />}
                    {isVideo ? 'Watch Offline' : 'Read Offline'}
                  </button>

                  <button
                    type="button"
                    title="Remove from offline downloads"
                    onClick={() => handleDeleteItem(item.id, item.title)}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Offline DRM PDF In-App Reader Modal ── */}
      {activeOfflineDoc && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in select-none"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="h-14 px-5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-sm truncate max-w-sm sm:max-w-md">
                    {activeOfflineDoc.item.title}
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Playing from Offline Vault • In-App Encrypted
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

            <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
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
          className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn select-none"
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
