import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Wifi, Radio, X, RefreshCw, Cpu, Server, Clock, AlertTriangle } from 'lucide-react';

export function WebRTCDiagnostics({ transport, isOpen, onClose, role = 'Teacher' }) {
  const [diagnosticsData, setDiagnosticsData] = useState({ peers: [], lastCloseHistory: [] });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (!isOpen || !transport) return;

    const fetchStats = async () => {
      if (transport.getDiagnostics) {
        const diag = await transport.getDiagnostics();
        if (Array.isArray(diag)) {
          setDiagnosticsData({ peers: diag, lastCloseHistory: [] });
        } else if (diag && diag.peers) {
          setDiagnosticsData(diag);
        }
        setLastUpdated(new Date());
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, [isOpen, transport]);

  if (!isOpen) return null;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const peers = diagnosticsData.peers || [];
  const history = diagnosticsData.lastCloseHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-2xl shadow-2xl text-slate-200 space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                WebRTC Real-Time Diagnostics
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-semibold uppercase">
                  {role}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Live peer connection telemetry, ICE candidate exchange & media stream health
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {peers.length === 0 ? (
            <div className="py-6 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-500">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="text-xs font-bold text-white">No active WebRTC peer connections established yet.</p>
                <p className="text-[11px] text-slate-500">
                  {role === 'Teacher'
                    ? 'Connections will appear once students join your live broadcast.'
                    : 'Awaiting incoming WebRTC stream offer from teacher broadcast studio.'}
                </p>
              </div>

              {/* Close History if available */}
              {history.length > 0 && (
                <div className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2 max-w-md mx-auto">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Recent Peer Lifecycle Events:</span>
                  </div>
                  {history.map((h, i) => (
                    <div key={i} className="text-[10px] font-mono text-slate-400 border-t border-slate-900 pt-1 flex items-center justify-between">
                      <span className="truncate max-w-[180px]">{h.reason}</span>
                      <span className="text-slate-500">{h.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            peers.map((peer, idx) => (
              <div key={peer.peerId || idx} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="font-mono text-indigo-400 font-bold text-[11px]">
                    Peer: {peer.debugPeerId || peer.peerId?.slice(0, 14)}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                      peer.connectionState === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : peer.connectionState === 'failed'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      Peer: {peer.connectionState || 'connecting'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                      peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'disconnected'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      ICE: {peer.iceConnectionState || 'checking'}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      Gathering: {peer.iceGatheringState || 'new'}
                    </span>
                  </div>
                </div>

                {/* Candidate Pair Details */}
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-slate-400">Candidate Pair:</span>
                    <span className="font-bold text-white">
                      {peer.localCandidateType ? `${peer.localCandidateType.toUpperCase()} (local) ↔ ${peer.remoteCandidateType ? peer.remoteCandidateType.toUpperCase() : '?'}` : 'Negotiating candidate pair...'}
                    </span>
                  </div>
                  {peer.dtlsState && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>DTLS: <strong className="text-slate-200">{peer.dtlsState}</strong></span>
                    </div>
                  )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Data Sent</span>
                    <span className="font-bold text-white text-xs">{formatBytes(peer.bytesSent)}</span>
                    <span className="text-[10px] text-slate-500 block">({peer.packetsSent} pkts)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Data Received</span>
                    <span className="font-bold text-emerald-400 text-xs">{formatBytes(peer.bytesReceived)}</span>
                    <span className="text-[10px] text-slate-500 block">({peer.packetsReceived} pkts)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Packet Loss & RTT</span>
                    <span className={`font-bold text-xs ${peer.packetsLost > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {peer.packetsLost} pkts lost
                    </span>
                    <span className="text-[10px] text-slate-500 block">RTT: {(peer.rtt * 1000).toFixed(0)} ms</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Tracks Published</span>
                    <span className="font-bold text-indigo-300 text-xs">
                      V: {peer.localVideoTracks} | A: {peer.localAudioTracks}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Recv: V: {peer.remoteVideoTracks} | A: {peer.remoteAudioTracks}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Auto-refreshes every second (read-only)</span>
          <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
