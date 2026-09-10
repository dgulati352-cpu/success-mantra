/**
 * NVIDIA NIM Client for Success Mantra AI
 * Uses OpenAI-compatible API endpoint: https://integrate.api.nvidia.com/v1/chat/completions
 * Model: google/gemma-4-31b-it (or NVIDIA_AI_MODEL from env)
 * NEVER hardcodes API key. Backend-only.
 */

const DEFAULT_MODEL = 'google/gemma-4-31b-it';
const FALLBACK_MODEL = 'meta/llama-3.2-11b-vision-instruct';
const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

/**
 * Call NVIDIA NIM API with timeout, retry, and secure error handling
 */
async function callNvidiaChatCompletions({
  messages,
  tools = null,
  toolChoice = 'auto',
  temperature = 0.3,
  maxTokens = 1024,
  timeoutMs = null
}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    const err = new Error('NVIDIA_API_KEY is not configured in backend environment.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const primaryModel = process.env.NVIDIA_AI_MODEL || DEFAULT_MODEL;
  const timeout = timeoutMs || parseInt(process.env.AI_REQUEST_TIMEOUT_MS, 10) || 8000;

  async function executeRequest(modelToUse, isFallback = false) {
    const requestBody = {
      model: modelToUse,
      messages,
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
    const effectiveTimeout = isFallback ? 8000 : Math.min(timeout, 8000);
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const response = await fetch(NVIDIA_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
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
          const err = new Error('NVIDIA AI rate limit exceeded.');
          err.code = 'AI_RATE_LIMIT';
          err.statusCode = 429;
          throw err;
        }

        // If primary model 504 gateway timeout / unavailable, try fallback model
        if ((status === 504 || status === 503 || status === 500) && !isFallback && modelToUse !== FALLBACK_MODEL) {
          console.warn(`[NVIDIA NIM] ${modelToUse} returned ${status}. Retrying with resilient fallback model ${FALLBACK_MODEL}...`);
          return await executeRequest(FALLBACK_MODEL, true);
        }

        const err = new Error(`NVIDIA API call failed with status ${status}`);
        err.code = 'AI_API_ERROR';
        err.statusCode = status;
        throw err;
      }

      const json = await response.json();
      return json;
    } catch (err) {
      clearTimeout(timer);
      if ((err.name === 'AbortError' || err.code === 'ABORT_ERR') && !isFallback && modelToUse !== FALLBACK_MODEL) {
        console.warn(`[NVIDIA NIM] ${modelToUse} timed out. Retrying with resilient fallback model ${FALLBACK_MODEL}...`);
        return await executeRequest(FALLBACK_MODEL, true);
      }
      if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
        const timeoutErr = new Error(`AI request timed out after ${effectiveTimeout}ms.`);
        timeoutErr.code = 'AI_TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  return await executeRequest(primaryModel, false);
}

module.exports = {
  callNvidiaChatCompletions,
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  NVIDIA_ENDPOINT
};
