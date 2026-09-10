/**
 * Sanitizer for Success Mantra AI Agent
 * Ensures no credentials, secrets, tokens, password hashes, or internal database metadata are exposed to the LLM or user.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /hash/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /(?:^|[_-])auth(?:$|[_-])/i,
  /authorization/i,
  /bearer/i,
  /credential/i,
  /private[_-]?key/i,
  /stream[_-]?key/i,
  /whip/i,
  /signature/i,
  /card[_-]?number/i,
  /cvv/i,
  /pin/i
];

/**
 * Recursively sanitize an object or value before returning it to the AI / client
 */
function sanitizeToolOutput(data, depth = 0) {
  if (depth > 6) return null;
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact JWT tokens, auth headers, and secrets in text
    let clean = data
      .replace(/ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_TOKEN]')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      .replace(/rtmps:\/\/[^\s]+/gi, '[LIVE_BROADCAST_STREAM]')
      .replace(/([a-zA-Z0-9_-]{24,})/g, (match) => {
        // Redact very long random hex/alphanumeric tokens unless it's a standard UUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match)) {
          return match;
        }
        return match.length > 32 ? '[REDACTED_KEY]' : match;
      });
    return clean;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeToolOutput(item, depth + 1));
  }

  if (typeof data === 'object') {
    const cleanObj = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some(pat => pat.test(key));
      if (isSensitive) {
        cleanObj[key] = '[REDACTED]';
      } else {
        cleanObj[key] = sanitizeToolOutput(value, depth + 1);
      }
    }
    return cleanObj;
  }

  return data;
}

/**
 * Sanitize prompt/user input text to avoid dangerous control characters or oversized payloads
 */
function sanitizeUserInput(text, maxChars = 2000) {
  if (!text || typeof text !== 'string') return '';
  // Truncate length
  let clean = text.slice(0, maxChars).trim();
  // Remove null bytes
  clean = clean.replace(/\0/g, '');
  return clean;
}

module.exports = {
  sanitizeToolOutput,
  sanitizeUserInput
};
