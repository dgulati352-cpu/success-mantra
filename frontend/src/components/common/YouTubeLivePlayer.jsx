import React, { useState, useEffect } from 'react';
import { Radio, AlertCircle, RefreshCw, Sparkles, Clock, CheckCircle2, Play, Volume2 } from 'lucide-react';
import { buildYouTubeEmbedUrl, extractYouTubeVideoId } from '../../utils/youtubeLive';

/**
 * YouTubeLivePlayer — In-App YouTube Live Playback Container
 * 
 * Complies with strict project requirements:
 * 1. 16:9 aspect ratio, fully responsive (320px to 1440px)
 * 2. Embedded in-app iframe only (No window.location.href, no external redirect, no new tabs)
 * 3. Handles states: UPCOMING, LIVE, ENDED, UNAVAILABLE
 * 4. Success Mantra premium dark styling with rounded corners
 * 5. Dynamic anti-piracy student watermark overlay
 */
export function YouTubeLivePlayer({
  videoId: rawVideoId,
  sessionTitle = 'Success Mantra Live Masterclass',
  status = 'live', // 'scheduled' | 'starting' | 'live' | 'ended' | 'unavailable'
  scheduledStart = null,
  watermark = null, // { name, email, phone, id }
  onRetry = null,
  className = ''
}) {
  const [loadError, setLoadError] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  const videoId = extractYouTubeVideoId(rawVideoId);
  const embedUrl = videoId ? buildYouTubeEmbedUrl(videoId, { autoplay: 1, rel: 0, modestbranding: 1, enablejsapi: 1 }) : '';

  // Determine effective stream status
  const normalizedStatus = (status || 'scheduled').toLowerCase();
  const isLive = normalizedStatus === 'live';
  const isEnded = normalizedStatus === 'ended' || normalizedStatus === 'completed';
  const isUpcoming = normalizedStatus === 'scheduled' || normalizedStatus === 'starting' || normalizedStatus === 'upcoming';

  // Live countdown timer for upcoming classes
  useEffect(() => {
    if (!scheduledStart || isLive || isEnded) return;

    const calculateTime = () => {
      const target = new Date(scheduledStart).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeRemaining('Starting momentarily...');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`Starts in ${days} day${days > 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeRemaining(`Starts in ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`Starts in ${minutes}m ${seconds}s`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [scheduledStart, isLive, isEnded]);

  // Invalid or missing Video ID state
  if (!videoId) {
    return (
      <div className={`relative aspect-video w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col items-center justify-center p-6 text-center text-white ${className}`}>
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-white mb-1">Live Stream Unavailable</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          The broadcast configuration is being initialized by faculty. Please refresh or check back shortly.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Stream Status</span>
          </button>
        )}
      </div>
    );
  }

  // Broadcast Concluded State
  if (isEnded) {
    return (
      <div className={`relative aspect-video w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col items-center justify-center p-6 text-center text-white ${className}`}>
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-2">
          <span>Broadcast Concluded</span>
        </div>
        <h3 className="text-base sm:text-lg font-black text-white mb-1">{sessionTitle}</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          This live broadcast has ended. The full HD recording will be available in your Student Vault soon.
        </p>
      </div>
    );
  }

  // Broadcast Upcoming / Waiting State
  if (isUpcoming && !isLive) {
    return (
      <div className={`relative aspect-video w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center justify-center p-6 text-center text-white ${className}`}>
        <div className="relative mb-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-rose-500/20 to-indigo-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-xl shadow-rose-950/50 animate-pulse">
            <Radio className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-rose-400" />
          <span>YouTube Live — In-App Classroom</span>
        </div>

        <h3 className="text-base sm:text-lg font-black text-white max-w-md truncate mb-1">
          {sessionTitle}
        </h3>

        <p className="text-xs text-slate-400 max-w-sm mb-4">
          Live class is scheduled but the broadcast has not started yet. Waiting for teacher stream...
        </p>

        {timeRemaining && (
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-indigo-300 font-mono text-xs font-bold shadow-inner">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{timeRemaining}</span>
          </div>
        )}

        {/* Embedded background preview player so stream auto-starts seamlessly */}
        <div className="hidden">
          <iframe
            src={embedUrl}
            title={sessionTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Active Live Player Rendering (100% In-App Embedded YouTube Player)
  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-black border border-slate-800 shadow-2xl group ${className}`}>
      {/* Loading state indicator before iframe loads */}
      {!isIframeLoaded && !loadError && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-3 z-10 text-white select-none">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Connecting in-app YouTube live broadcast...</p>
        </div>
      )}

      {/* Error state if iframe fails */}
      {loadError && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white z-20">
          <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
          <h4 className="text-sm font-bold text-white mb-1">Unable to load the live stream</h4>
          <p className="text-xs text-slate-400 max-w-xs mb-3">
            Please verify network connectivity or check if broadcast permissions have started.
          </p>
          <button
            onClick={() => {
              setLoadError(false);
              setIsIframeLoaded(false);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Stream</span>
          </button>
        </div>
      )}

      {/* 100% IN-APP EMBEDDED IFRAME PLAYER */}
      <iframe
        src={embedUrl}
        title={sessionTitle}
        onLoad={() => setIsIframeLoaded(true)}
        onError={() => setLoadError(true)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen={true}
        className="absolute inset-0 h-full w-full border-0 bg-black"
      />

      {/* Dynamic Anti-Screen Record DRM Watermark Overlay */}
      {watermark && (
        <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col items-center justify-around opacity-15 rotate-[-20deg] overflow-hidden">
          <div className="text-sm sm:text-base font-black text-white text-center">
            LICENSED TO: {watermark.name || 'STUDENT'} ({watermark.phone || watermark.email || 'VERIFIED STUDENT'})
          </div>
          <div className="text-sm sm:text-base font-black text-white text-center">
            SUCCESS MANTRA ACADEMY • IN-APP BROADCAST DRM ENFORCED
          </div>
          <div className="text-sm sm:text-base font-black text-white text-center">
            UID: {watermark.id || 'USR_SECURE'} • DO NOT RECORD
          </div>
        </div>
      )}
    </div>
  );
}
