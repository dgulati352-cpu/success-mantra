/**
 * Cloudflare Stream Live Streaming Service
 * 
 * Provides:
 * 1. Playback URL normalizer (HLS, Iframe embed, WebRTC WHEP/WHIP)
 * 2. Automated Live Input provisioning via Cloudflare REST API (when token configured)
 * 3. Fallback resolution for universal videodelivery.net and cloudflarestream.com endpoints
 */

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '7c210c8090a82af486eba01139e9d7d0';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_STREAM_TOKEN || '';
const CLOUDFLARE_CUSTOMER_SUBDOMAIN = process.env.CLOUDFLARE_STREAM_SUBDOMAIN || '';

/**
 * Normalizes any Cloudflare Stream input (UID, full iframe URL, or HLS manifest)
 * into standard usable playback, iframe, and WebRTC URLs.
 *
 * @param {string} input - Cloudflare Stream ID, Iframe URL, or HLS link
 * @returns {{ streamId: string, iframeUrl: string, hlsUrl: string, whepUrl: string, whipUrl: string, rtmpsUrl: string }}
 */
function normalizePlayback(input) {
  if (!input || typeof input !== 'string') {
    return {
      streamId: '',
      iframeUrl: '',
      hlsUrl: '',
      whepUrl: '',
      whipUrl: '',
      rtmpsUrl: 'rtmps://live.cloudflare.com:443/live/'
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
      rtmpsUrl: 'rtmps://live.cloudflare.com:443/live/'
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
      rtmpsUrl: 'rtmps://live.cloudflare.com:443/live/'
    };
  }

  // Pattern 4: Bare Stream Video / Live Input UID (32-64 hex/alphanumeric characters)
  if (/^[a-zA-Z0-9_-]{16,64}$/.test(trimmed)) {
    const streamId = trimmed;
    const baseDomain = CLOUDFLARE_CUSTOMER_SUBDOMAIN
      ? `https://${CLOUDFLARE_CUSTOMER_SUBDOMAIN}.cloudflarestream.com`
      : 'https://iframe.videodelivery.net';

    return {
      streamId,
      iframeUrl: CLOUDFLARE_CUSTOMER_SUBDOMAIN
        ? `${baseDomain}/${streamId}/iframe`
        : `https://iframe.videodelivery.net/${streamId}`,
      hlsUrl: `https://videodelivery.net/${streamId}/manifest/video.m3u8`,
      whepUrl: `https://videodelivery.net/${streamId}/webRTC/play`,
      whipUrl: `https://videodelivery.net/${streamId}/webRTC/publish`,
      rtmpsUrl: 'rtmps://live.cloudflare.com:443/live/'
    };
  }

  // Pattern 5: External HLS or Embed URL
  return {
    streamId: '',
    iframeUrl: rawUrl,
    hlsUrl: rawUrl.endsWith('.m3u8') ? rawUrl : '',
    whepUrl: '',
    whipUrl: '',
    rtmpsUrl: 'rtmps://live.cloudflare.com:443/live/'
  };
}

/**
 * Creates a new Live Input on Cloudflare Stream via REST API
 * (Requires CLOUDFLARE_API_TOKEN in environment)
 */
async function createLiveInput({ title = 'Live Masterclass', recordingMode = 'automatic' }) {
  if (!CLOUDFLARE_API_TOKEN) {
    return {
      success: false,
      message: 'Cloudflare API Token not configured. Please enter your Cloudflare Stream details manually.'
    };
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meta: { name: title },
        recording: {
          mode: recordingMode,
          timeoutSeconds: 300,
          requireSignedURLs: false
        }
      })
    });

    const data = await res.json();
    if (!data.success || !data.result) {
      throw new Error(data.errors?.[0]?.message || 'Failed creating live input on Cloudflare');
    }

    const item = data.result;
    const streamId = item.uid;
    const rtmpsKey = item.rtmps?.streamKey || '';
    const rtmpsUrl = item.rtmps?.url || 'rtmps://live.cloudflare.com:443/live/';
    const whipUrl = item.webRTC?.url || `https://videodelivery.net/${streamId}/webRTC/publish`;
    const whepUrl = item.webRTCPlayback?.url || `https://videodelivery.net/${streamId}/webRTC/play`;
    const hlsUrl = item.hls?.playback || `https://videodelivery.net/${streamId}/manifest/video.m3u8`;
    const iframeUrl = `https://iframe.videodelivery.net/${streamId}`;

    return {
      success: true,
      data: {
        streamId,
        rtmpsUrl,
        rtmpsKey,
        whipUrl,
        whepUrl,
        hlsUrl,
        iframeUrl
      }
    };
  } catch (err) {
    console.error('[CLOUDFLARE_STREAM_API_ERROR]', err);
    return {
      success: false,
      message: err.message || 'Error connecting to Cloudflare Stream API'
    };
  }
}

/**
 * Retrieves the live status of an input directly from Cloudflare Stream
 * (Checks whether OBS / encoder is actively pushing video frames)
 */
async function getLiveInputStatus(streamId) {
  if (!streamId || typeof streamId !== 'string') {
    return {
      success: false,
      isConnected: false,
      status: 'disconnected',
      message: 'No Stream UID provided'
    };
  }

  const cleanId = streamId.trim();

  // If Cloudflare token is not configured, report unavailable diagnostic cleanly
  if (!CLOUDFLARE_API_TOKEN) {
    return {
      success: false,
      tokenConfigured: false,
      isConnected: false,
      status: 'unknown',
      message: 'Cloudflare API Token not configured on server'
    };
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${cleanId}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (!data.success || !data.result) {
      return {
        success: false,
        tokenConfigured: true,
        isConnected: false,
        status: 'not_found',
        message: data.errors?.[0]?.message || 'Live input not found on Cloudflare'
      };
    }

    const input = data.result;
    const cfStatus = (input.status || '').toLowerCase();
    const isConnected = cfStatus === 'connected' || cfStatus === 'ready';

    return {
      success: true,
      tokenConfigured: true,
      isConnected,
      status: cfStatus, // 'connected' | 'disconnected' | 'ready' | 'reconnecting'
      input: {
        uid: input.uid,
        name: input.meta?.name || '',
        created: input.created,
        modified: input.modified,
        rtmpsUrl: input.rtmps?.url || 'rtmps://live.cloudflare.com:443/live/',
        hlsPlayback: input.hls?.playback || `https://videodelivery.net/${input.uid}/manifest/video.m3u8`,
        iframePlayback: `https://iframe.videodelivery.net/${input.uid}`
      }
    };
  } catch (err) {
    console.error('[CLOUDFLARE_GET_STATUS_ERROR]', err);
    return {
      success: false,
      tokenConfigured: true,
      isConnected: false,
      status: 'error',
      message: err.message || 'Failed connecting to Cloudflare Stream API'
    };
  }
}

/**
 * Retrieves recorded videos linked to a Cloudflare Live Input
 */
async function getLiveInputVideos(streamId) {
  if (!streamId || !CLOUDFLARE_API_TOKEN) {
    return { success: false, videos: [] };
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${streamId.trim()}/videos`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (data.success && Array.isArray(data.result)) {
      return {
        success: true,
        videos: data.result.map(v => ({
          uid: v.uid,
          status: v.status?.state || 'ready',
          pctComplete: v.status?.pctComplete || '100',
          duration: v.duration || 0,
          created: v.created,
          previewUrl: v.preview || `https://customer-xxx.cloudflarestream.com/${v.uid}/watch`,
          hlsUrl: v.playback?.hls || `https://videodelivery.net/${v.uid}/manifest/video.m3u8`,
          iframeUrl: `https://iframe.videodelivery.net/${v.uid}`
        }))
      };
    }
    return { success: false, videos: [] };
  } catch (err) {
    return { success: false, videos: [], error: err.message };
  }
}

/**
 * Retrieves individual video processing state from Cloudflare Stream
 */
async function getVideoDetails(videoUid) {
  if (!videoUid || !CLOUDFLARE_API_TOKEN) {
    return { success: false, message: 'Missing video UID or API token' };
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${videoUid.trim()}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (data.success && data.result) {
      const v = data.result;
      const state = (v.status?.state || '').toLowerCase();
      return {
        success: true,
        uid: v.uid,
        isReady: state === 'ready',
        state, // 'ready' | 'inprogress' | 'queued' | 'error'
        pctComplete: v.status?.pctComplete || '0',
        duration: v.duration || 0,
        hlsUrl: v.playback?.hls || `https://videodelivery.net/${v.uid}/manifest/video.m3u8`,
        iframeUrl: `https://iframe.videodelivery.net/${v.uid}`
      };
    }
    return { success: false, message: data.errors?.[0]?.message || 'Video not found' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = {
  CLOUDFLARE_ACCOUNT_ID,
  normalizePlayback,
  createLiveInput,
  getLiveInputStatus,
  getLiveInputVideos,
  getVideoDetails
};
