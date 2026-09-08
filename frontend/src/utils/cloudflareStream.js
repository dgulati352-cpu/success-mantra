/**
 * Cloudflare Stream Helper Utility
 * Normalizes any Cloudflare Stream input (UID, full iframe URL, customer subdomain, or HLS manifest)
 * into standardized playback, iframe, and WebRTC URLs for frontend rendering.
 */

export const CLOUDFLARE_DEFAULT_RTMPS_URL = 'rtmps://live.cloudflare.com:443/live/';

export function normalizeCloudflarePlayback(input) {
  if (!input || typeof input !== 'string') {
    return {
      streamId: '',
      iframeUrl: '',
      hlsUrl: '',
      whipUrl: '',
      whepUrl: '',
      rtmpsUrl: CLOUDFLARE_DEFAULT_RTMPS_URL,
      isCloudflare: false
    };
  }

  const trimmed = input.trim();

  // Pattern 1: User pasted full iframe HTML like <iframe src="..." />
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  const rawUrl = iframeMatch ? iframeMatch[1] : trimmed;

  // Pattern 2: Cloudflare Customer Domain (https://customer-xxx.cloudflarestream.com/<ID>/...)
  const customerMatch = rawUrl.match(/https?:\/\/(customer-[a-z0-9]+)\.cloudflarestream\.com\/([a-zA-Z0-9_-]+)/i);
  if (customerMatch) {
    const sub = customerMatch[1];
    const streamId = customerMatch[2];
    return {
      streamId,
      iframeUrl: `https://${sub}.cloudflarestream.com/${streamId}/iframe`,
      hlsUrl: `https://${sub}.cloudflarestream.com/${streamId}/manifest/video.m3u8`,
      whepUrl: `https://${sub}.cloudflarestream.com/${streamId}/webRTC/play`,
      whipUrl: `https://${sub}.cloudflarestream.com/${streamId}/webRTC/publish`,
      rtmpsUrl: CLOUDFLARE_DEFAULT_RTMPS_URL,
      isCloudflare: true
    };
  }

  // Pattern 3: Universal videodelivery.net URL (https://iframe.videodelivery.net/<ID> or https://videodelivery.net/<ID>/...)
  const videoDeliveryMatch = rawUrl.match(/https?:\/\/(?:iframe\.)?videodelivery\.net\/([a-zA-Z0-9_-]+)/i);
  if (videoDeliveryMatch) {
    const streamId = videoDeliveryMatch[1];
    return {
      streamId,
      iframeUrl: `https://iframe.videodelivery.net/${streamId}`,
      hlsUrl: `https://videodelivery.net/${streamId}/manifest/video.m3u8`,
      whepUrl: `https://videodelivery.net/${streamId}/webRTC/play`,
      whipUrl: `https://videodelivery.net/${streamId}/webRTC/publish`,
      rtmpsUrl: CLOUDFLARE_DEFAULT_RTMPS_URL,
      isCloudflare: true
    };
  }

  // Pattern 4: Bare Stream Video / Live Input UID (32-64 hex/alphanumeric characters)
  if (/^[a-zA-Z0-9_-]{16,64}$/.test(trimmed)) {
    const streamId = trimmed;
    return {
      streamId,
      iframeUrl: `https://iframe.videodelivery.net/${streamId}`,
      hlsUrl: `https://videodelivery.net/${streamId}/manifest/video.m3u8`,
      whepUrl: `https://videodelivery.net/${streamId}/webRTC/play`,
      whipUrl: `https://videodelivery.net/${streamId}/webRTC/publish`,
      rtmpsUrl: CLOUDFLARE_DEFAULT_RTMPS_URL,
      isCloudflare: true
    };
  }

  // Pattern 5: External HLS or Embed URL
  const isCloudflareHeuristic = rawUrl.includes('cloudflare') || rawUrl.includes('videodelivery.net');
  return {
    streamId: '',
    iframeUrl: rawUrl,
    hlsUrl: rawUrl.endsWith('.m3u8') ? rawUrl : '',
    whepUrl: '',
    whipUrl: '',
    rtmpsUrl: CLOUDFLARE_DEFAULT_RTMPS_URL,
    isCloudflare: isCloudflareHeuristic
  };
}
