/**
 * Success Mantra Academy — YouTube Live Validation & Embed Utility
 * Strictly generates secure embed URLs from validated 11-char Video IDs.
 * Zero external redirects.
 */

/**
 * Extracts and validates the 11-character YouTube Video ID from standard URLs or raw ID.
 * Supports:
 * - https://www.youtube.com/watch?v=XXXXXXXXXXX
 * - https://youtu.be/XXXXXXXXXXX
 * - https://www.youtube.com/live/XXXXXXXXXXX
 * - https://www.youtube.com/embed/XXXXXXXXXXX
 * - https://m.youtube.com/watch?v=XXXXXXXXXXX
 * - https://www.youtube.com/shorts/XXXXXXXXXXX
 * - XXXXXXXXXXX (direct 11-char ID)
 * 
 * @param {string} input - YouTube URL or raw Video ID
 * @returns {string|null} - 11-character Video ID or null if invalid
 */
export function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct 11-character Video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // URL matching
  const regex = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|\S*?[?&]vi=|live\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = trimmed.match(regex);
  if (match && match[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
    return match[1];
  }

  return null;
}

/**
 * Validates YouTube URL or Video ID and returns structured result
 * @param {string} input
 * @returns {{ isValid: boolean, videoId: string|null, embedUrl: string|null, error: string|null }}
 */
export function validateYouTubeLiveInput(input) {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      videoId: null,
      embedUrl: null,
      error: 'Please enter a YouTube Live URL or Video ID.'
    };
  }

  const videoId = extractYouTubeVideoId(input);
  if (!videoId) {
    return {
      isValid: false,
      videoId: null,
      embedUrl: null,
      error: 'Invalid YouTube link or Video ID. Expected 11 characters (e.g. dQw4w9WgXcQ or https://youtube.com/watch?v=...)'
    };
  }

  const embedUrl = buildYouTubeEmbedUrl(videoId);
  return {
    isValid: true,
    videoId,
    embedUrl,
    error: null
  };
}

/**
 * Builds a secure in-app embed URL using youtube-nocookie.com domain
 * @param {string} videoId - 11 character YouTube Video ID
 * @param {object} options
 * @returns {string}
 */
export function buildYouTubeEmbedUrl(videoId, options = {}) {
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return '';
  }
  const {
    autoplay = 1,
    rel = 0,
    modestbranding = 1,
    enablejsapi = 1,
    origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.camanishkalra.com'
  } = options;

  const params = new URLSearchParams({
    autoplay: String(autoplay),
    rel: String(rel),
    modestbranding: String(modestbranding),
    enablejsapi: String(enablejsapi),
    playsinline: '1',
    origin
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
