/**
 * Success Mantra Academy — YouTube Live Integration Service
 * Google OAuth 2.0 & YouTube Data API v3 Management
 * Strictly preserves all secrets server-side.
 */

const { getDoc, setDoc, updateDoc } = require('../database/firestore');
const { getDb } = require('../database/schema');

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || '';
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || '';
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'https://www.camanishkalra.com/api/admin/youtube/callback';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

class YouTubeLiveService {
  /**
   * Generates Google OAuth 2.0 authorization URL for teacher to connect their YouTube channel
   */
  getAuthUrl(state = 'admin_studio') {
    if (!YOUTUBE_CLIENT_ID) {
      return null;
    }
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: YOUTUBE_REDIRECT_URI,
      client_id: YOUTUBE_CLIENT_ID,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.readonly'
      ].join(' '),
      state
    };
    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  /**
   * Exchanges OAuth authorization code for Access & Refresh tokens
   */
  async handleCallback(code) {
    if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
      throw new Error('YouTube OAuth credentials not configured on server.');
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const values = {
      code,
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      redirect_uri: YOUTUBE_REDIRECT_URI,
      grant_type: 'authorization_code'
    };

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(values)
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error_description || data.error || 'Failed to exchange YouTube authorization code.');
    }

    // Save tokens securely in Firestore & SQLite settings
    const tokenDoc = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
      updated_at: new Date().toISOString()
    };

    try {
      await setDoc('system_settings', 'youtube_oauth', tokenDoc);
    } catch (e) {}

    const db = getDb();
    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT INTO settings (key, value, updated_at)
          VALUES ('youtube_oauth', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `).run(JSON.stringify(tokenDoc));
      } catch (sqErr) {}
    }

    return { success: true, connected: true };
  }

  /**
   * Retrieves active access token, refreshing if necessary
   */
  async getValidAccessToken() {
    let saved = null;
    const db = getDb();
    if (db && typeof db.prepare === 'function') {
      try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'youtube_oauth'").get();
        if (row && row.value) {
          saved = JSON.parse(row.value);
        }
      } catch (e) {}
    }

    if (!saved) {
      try {
        saved = await getDoc('system_settings', 'youtube_oauth');
      } catch (e) {}
    }

    if (!saved || !saved.refresh_token) {
      return null;
    }

    // Refresh token
    if (YOUTUBE_CLIENT_ID && YOUTUBE_CLIENT_SECRET && saved.refresh_token) {
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: YOUTUBE_CLIENT_ID,
            client_secret: YOUTUBE_CLIENT_SECRET,
            refresh_token: saved.refresh_token,
            grant_type: 'refresh_token'
          })
        });
        const refreshData = await res.json();
        if (res.ok && refreshData.access_token) {
          return refreshData.access_token;
        }
      } catch (err) {
        console.warn('YouTube token refresh error:', err.message);
      }
    }

    return saved.access_token || null;
  }

  /**
   * Checks if YouTube channel is connected
   */
  async isConnected() {
    const token = await this.getValidAccessToken();
    return Boolean(token);
  }

  /**
   * Creates a YouTube Live Broadcast & Stream and binds them
   */
  async createLiveBroadcast({ title, description, scheduledStartTime }) {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      // Return simulated/manual stream config if OAuth is not connected
      return {
        success: true,
        isConfigured: false,
        broadcastId: `yt_sim_${Date.now()}`,
        youtubeUrl: `https://www.youtube.com/watch?v=live_${Date.now()}`,
        status: 'ready',
        message: 'YouTube OAuth not connected. Using standalone stream link mode.'
      };
    }

    // 1. Insert Broadcast
    const broadcastBody = {
      snippet: {
        title: title || 'Success Mantra Live Masterclass',
        description: description || 'Live interactive class broadcast on Success Mantra.',
        scheduledStartTime: scheduledStartTime || new Date().toISOString()
      },
      status: {
        privacyStatus: 'unlisted', // 'public' | 'unlisted' | 'private'
        selfDeclaredMadeForKids: false
      },
      contentDetails: {
        enableAutoStart: true,
        enableAutoStop: true,
        recordFromStart: true
      }
    };

    const broadcastRes = await fetch('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(broadcastBody)
    });

    const broadcastData = await broadcastRes.json();
    if (!broadcastRes.ok) {
      throw new Error(broadcastData.error?.message || 'Failed to create YouTube Live Broadcast.');
    }

    // 2. Insert Stream
    const streamBody = {
      snippet: {
        title: `${title || 'Class'} Stream`,
      },
      cdn: {
        frameRate: 'variable',
        ingestionType: 'rtmp',
        resolution: 'variable'
      }
    };

    const streamRes = await fetch('https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(streamBody)
    });

    const streamData = await streamRes.json();
    if (!streamRes.ok) {
      throw new Error(streamData.error?.message || 'Failed to create YouTube Live Stream.');
    }

    // 3. Bind Broadcast to Stream
    await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastData.id}&part=id,contentDetails&streamId=${streamData.id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const ingestionInfo = streamData.cdn?.ingestionInfo || {};

    return {
      success: true,
      isConfigured: true,
      broadcastId: broadcastData.id,
      streamId: streamData.id,
      rtmpUrl: ingestionInfo.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: ingestionInfo.streamName || '',
      youtubeUrl: `https://www.youtube.com/watch?v=${broadcastData.id}`,
      status: 'ready'
    };
  }

  /**
   * Extracts and validates the 11-character YouTube Video ID
   * @param {string} input - YouTube URL or raw Video ID
   * @returns {string|null}
   */
  extractVideoId(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    const regex = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|\S*?[?&]vi=|live\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const match = trimmed.match(regex);
    if (match && match[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
      return match[1];
    }
    return null;
  }

  /**
   * Validates YouTube URL or Video ID
   * @param {string} input
   * @returns {{ isValid: boolean, videoId: string|null, embedUrl: string|null, error: string|null }}
   */
  validateInput(input) {
    if (!input || !input.trim()) {
      return { isValid: false, videoId: null, embedUrl: null, error: 'YouTube URL or Video ID is required.' };
    }
    const videoId = this.extractVideoId(input);
    if (!videoId) {
      return { isValid: false, videoId: null, embedUrl: null, error: 'Invalid YouTube URL or Video ID. Must be 11 characters.' };
    }
    return {
      isValid: true,
      videoId,
      embedUrl: this.buildEmbedUrl(videoId),
      error: null
    };
  }

  /**
   * Generates secure embed URL from validated videoId
   * @param {string} videoId
   * @param {object} options
   * @returns {string}
   */
  buildEmbedUrl(videoId, options = {}) {
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return '';
    const { autoplay = 1, rel = 0, modestbranding = 1, enablejsapi = 1 } = options;
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay}&rel=${rel}&modestbranding=${modestbranding}&enablejsapi=${enablejsapi}&playsinline=1`;
  }

  /**
   * Fetches independent stream health and status from YouTube Data API
   */
  async getStreamStatus(broadcastId) {
    if (!broadcastId || broadcastId.startsWith('yt_sim_')) {
      return { status: 'ready', isLive: false, connected: false };
    }

    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      return { status: 'disconnected', isLive: false, connected: false };
    }

    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts?id=${broadcastId}&part=status`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (res.ok && data.items && data.items.length > 0) {
        const lifeCycleStatus = data.items[0].status?.lifeCycleStatus || 'ready';
        const isLive = lifeCycleStatus === 'live' || lifeCycleStatus === 'liveStarting';
        return {
          status: lifeCycleStatus,
          isLive,
          connected: true
        };
      }
    } catch (e) {}

    return { status: 'ready', isLive: false, connected: true };
  }
}

module.exports = new YouTubeLiveService();
