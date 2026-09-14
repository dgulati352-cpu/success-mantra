/**
 * Groq AI Client for Success Mantra
 * High-speed LPU inference via OpenAI-compatible endpoint: https://api.groq.com/openai/v1/chat/completions
 * Supports tool calling, fallback models, and automatic retries.
 */

const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Resolve Groq API key from environment
 */
function getGroqApiKey() {
  const directKey = process.env.GROQ_API_KEY;
  if (directKey && directKey.trim()) return directKey.trim();

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim().startsWith('gsk_')) return geminiKey.trim();

  const aiKey = process.env.AI_API_KEY;
  if (aiKey && aiKey.trim().startsWith('gsk_')) return aiKey.trim();

  return null;
}

/**
 * Call Groq chat completions with native OpenAI format
 */
async function callGroqChatCompletions({
  messages,
  tools = null,
  toolChoice = 'auto',
  temperature = 0.3,
  maxTokens = 1024,
  timeoutMs = null
}) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    const err = new Error('GROQ_API_KEY is not configured in backend environment.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const primaryModel = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const timeout = timeoutMs || parseInt(process.env.AI_REQUEST_TIMEOUT_MS, 10) || 25000;

  async function executeRequest(modelToUse, isFallback = false) {
    const cleanMessages = messages.map(m => {
      const msg = { role: m.role, content: m.content || '' };
      if (m.tool_calls) msg.tool_calls = m.tool_calls;
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
      if (m.name) msg.name = m.name;
      return msg;
    });

    const requestBody = {
      model: modelToUse,
      messages: cleanMessages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    };

    if (Array.isArray(tools) && tools.length > 0) {
      requestBody.tools = tools;
      if (toolChoice) {
        requestBody.tool_choice = toolChoice;
      }
    }

    const controller = new AbortController();
    const effectiveTimeout = isFallback ? 20000 : Math.min(timeout, 25000);
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        let errBody = '';
        try {
          errBody = await response.text();
        } catch (e) {}

        const status = response.status;
        if (status === 429) {
          if (!isFallback && modelToUse !== FALLBACK_MODEL) {
            console.warn(`[Groq AI] ${modelToUse} rate limited (429). Retrying with fallback model ${FALLBACK_MODEL}...`);
            return await executeRequest(FALLBACK_MODEL, true);
          }
          const err = new Error('Groq AI rate limit exceeded.');
          err.code = 'AI_RATE_LIMIT';
          err.statusCode = 429;
          throw err;
        }

        if ((status === 504 || status === 503 || status === 500) && !isFallback && modelToUse !== FALLBACK_MODEL) {
          console.warn(`[Groq AI] ${modelToUse} returned ${status}. Retrying with fallback model ${FALLBACK_MODEL}...`);
          return await executeRequest(FALLBACK_MODEL, true);
        }

        const err = new Error(`Groq API call failed with status ${status}: ${errBody.slice(0, 200)}`);
        err.code = 'AI_API_ERROR';
        err.statusCode = status;
        throw err;
      }

      const json = await response.json();
      return json;
    } catch (err) {
      clearTimeout(timer);
      if ((err.name === 'AbortError' || err.code === 'ABORT_ERR') && !isFallback && modelToUse !== FALLBACK_MODEL) {
        console.warn(`[Groq AI] ${modelToUse} timed out. Retrying with fallback model ${FALLBACK_MODEL}...`);
        return await executeRequest(FALLBACK_MODEL, true);
      }
      throw err;
    }
  }

  return await executeRequest(primaryModel, false);
}

module.exports = {
  callGroqChatCompletions,
  getGroqApiKey,
  DEFAULT_MODEL,
  FALLBACK_MODEL
};
