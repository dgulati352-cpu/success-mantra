/**
 * Utility functions for parsing, validating, and formatting video sources
 * Supports YouTube, Vimeo, Google Drive, and direct HTML5 video URLs.
 */

export function parseVideoSource(url) {
  if (!url || typeof url !== 'string') {
    return { type: 'unknown', embedUrl: '', rawUrl: '', thumbnail: '' };
  }

  const cleanUrl = url.trim();

  // 1. YouTube Detection
  // Matches: youtube.com/watch?v=xxx, youtu.be/xxx, youtube.com/embed/xxx, youtube.com/shorts/xxx
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
      rawUrl: cleanUrl,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      fallbackThumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  // 2. Vimeo Detection
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?))/i);
  if (vimeoMatch && vimeoMatch[3]) {
    const videoId = vimeoMatch[3];
    return {
      type: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`,
      rawUrl: cleanUrl,
      thumbnail: ''
    };
  }

  // 3. Google Drive Preview
  const driveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      type: 'drive',
      videoId: fileId,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      rawUrl: cleanUrl,
      thumbnail: ''
    };
  }

  // 4. Cloudflare Stream Detection (Universal & Customer Domain)
  const cfMatch = cleanUrl.match(/(?:(?:iframe\.)?videodelivery\.net|(?:customer-[a-z0-9]+\.)?cloudflarestream\.com)\/([a-zA-Z0-9_-]{16,64})/i);
  if (cfMatch && cfMatch[1]) {
    const streamId = cfMatch[1];
    return {
      type: 'cloudflare_stream',
      videoId: streamId,
      embedUrl: `https://iframe.videodelivery.net/${streamId}`,
      rawUrl: cleanUrl,
      thumbnail: `https://videodelivery.net/${streamId}/thumbnails/thumbnail.jpg`,
      hlsUrl: `https://videodelivery.net/${streamId}/manifest/video.m3u8`
    };
  }

  // 5. Direct HTML5 / Cloudflare R2 / Firebase Video (.mp4, .webm, .ogg, r2/file)
  const isDirectFile =
    cleanUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ||
    cleanUrl.includes('/r2/file/') ||
    cleanUrl.includes('r2.cloudflarestorage.com') ||
    cleanUrl.includes('firebasestorage.googleapis.com') ||
    cleanUrl.includes('blob:');

  return {
    type: isDirectFile ? 'html5' : 'embed',
    embedUrl: cleanUrl,
    rawUrl: cleanUrl,
    thumbnail: ''
  };
}

export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0 min';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins} mins`;
}
