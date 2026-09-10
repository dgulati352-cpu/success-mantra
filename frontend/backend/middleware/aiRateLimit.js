/**
 * Rate Limiting Middleware for AI Endpoints
 * Enforces per-user and per-IP limits to prevent abuse and excessive token consumption.
 */

const userRequestMap = new Map();
const ipRequestMap = new Map();

// Periodic cleanup of expired rate limit windows (every 2 minutes)
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [key, timestamps] of userRequestMap.entries()) {
    const valid = timestamps.filter(t => now - t < windowMs);
    if (valid.length === 0) userRequestMap.delete(key);
    else userRequestMap.set(key, valid);
  }
  for (const [key, timestamps] of ipRequestMap.entries()) {
    const valid = timestamps.filter(t => now - t < windowMs);
    if (valid.length === 0) ipRequestMap.delete(key);
    else ipRequestMap.set(key, valid);
  }
}, 2 * 60 * 1000);

function aiRateLimiter(req, res, next) {
  const maxPerMin = parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE, 10) || 20;
  const windowMs = 60 * 1000;
  const now = Date.now();

  // Validate body length
  if (req.body && typeof req.body.message === 'string' && req.body.message.length > 4000) {
    return res.status(400).json({
      success: false,
      message: 'Message is too long. Please keep your request under 4,000 characters.'
    });
  }

  const userId = req.user?.id || req.user?.userId;
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown-ip';

  // Check user limit
  if (userId) {
    const userHistory = userRequestMap.get(userId) || [];
    const validTimestamps = userHistory.filter(t => now - t < windowMs);

    if (validTimestamps.length >= maxPerMin) {
      const oldest = validTimestamps[0];
      const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
      res.setHeader('Retry-After', waitSeconds);
      res.setHeader('X-RateLimit-Limit', maxPerMin);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        success: false,
        message: `Too many AI requests. Please wait ${waitSeconds} seconds before trying again.`,
        retryAfterSeconds: waitSeconds
      });
    }

    validTimestamps.push(now);
    userRequestMap.set(userId, validTimestamps);
    res.setHeader('X-RateLimit-Limit', maxPerMin);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxPerMin - validTimestamps.length));
  } else {
    // IP based limiter
    const ipHistory = ipRequestMap.get(clientIp) || [];
    const validTimestamps = ipHistory.filter(t => now - t < windowMs);

    if (validTimestamps.length >= maxPerMin * 2) {
      const oldest = validTimestamps[0];
      const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
      res.setHeader('Retry-After', waitSeconds);
      return res.status(429).json({
        success: false,
        message: `Too many requests from this network. Please wait ${waitSeconds} seconds.`,
        retryAfterSeconds: waitSeconds
      });
    }

    validTimestamps.push(now);
    ipRequestMap.set(clientIp, validTimestamps);
  }

  next();
}

module.exports = aiRateLimiter;
