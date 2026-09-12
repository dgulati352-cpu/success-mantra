/**
 * Google Gemini Client for Success Mantra AI
 * Uses the official @google/genai SDK with the FREE TIER (gemini-2.0-flash).
 * Replaces the NVIDIA NIM client while maintaining the same interface contract
 * expected by aiAgent.js.
 *
 * Environment Variables:
 *   GEMINI_API_KEY   – Required. Your Google AI Studio API key.
 *   GEMINI_MODEL     – Optional. Defaults to 'gemini-2.0-flash' (free tier).
 *   AI_REQUEST_TIMEOUT_MS – Optional. Request timeout in ms (default 30000).
 *
 * SECURITY: The API key is NEVER exposed to the frontend or LLM context.
 */

const { GoogleGenAI } = require('@google/genai');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';

let _genaiInstance = null;

/**
 * Lazily initialize the GoogleGenAI singleton
 */
function getGenAI() {
  if (_genaiInstance) return _genaiInstance;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured in backend environment.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  _genaiInstance = new GoogleGenAI({ apiKey: apiKey.trim() });
  return _genaiInstance;
}

/**
 * Convert OpenAI-style tool definitions to Gemini function declarations.
 * The existing TOOL_DEFINITIONS in aiToolRouter.js use OpenAI format:
 *   { type: 'function', function: { name, description, parameters } }
 *
 * Gemini expects:
 *   { name, description, parameters }
 */
function convertToolsToGeminiFormat(openaiTools) {
  if (!Array.isArray(openaiTools) || openaiTools.length === 0) return undefined;

  const functionDeclarations = openaiTools.map(tool => {
    const fn = tool.function || tool;
    return {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters && Object.keys(fn.parameters.properties || {}).length > 0
        ? fn.parameters
        : undefined
    };
  });

  return [{ functionDeclarations }];
}

/**
 * Convert OpenAI-style messages to Gemini SDK format.
 *
 * OpenAI format:
 *   { role: 'system'|'user'|'assistant'|'tool', content: string, tool_calls?: [...], tool_call_id?: string }
 *
 * Gemini format:
 *   { role: 'user'|'model', parts: [{ text }|{ functionCall }|{ functionResponse }] }
 *
 * System instructions are extracted separately (Gemini has a dedicated systemInstruction field).
 */
function convertMessagesToGemini(openaiMessages) {
  let systemInstruction = '';
  const contents = [];

  for (const msg of openaiMessages) {
    if (msg.role === 'system') {
      systemInstruction += (systemInstruction ? '\n\n' : '') + msg.content;
      continue;
    }

    if (msg.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
      continue;
    }

    if (msg.role === 'assistant') {
      const parts = [];

      // If this message has tool_calls, add them as functionCall parts
      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          let args = {};
          try {
            args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments || {};
          } catch (e) {
            args = {};
          }
          parts.push({
            functionCall: {
              name: tc.function.name,
              args
            }
          });
        }
      }

      // If there's text content too, add it
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (parts.length > 0) {
        contents.push({ role: 'model', parts });
      }
      continue;
    }

    if (msg.role === 'tool') {
      // Gemini uses functionResponse inside a 'user' turn
      let responseData;
      try {
        responseData = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
      } catch (e) {
        responseData = { result: msg.content };
      }

      // Gemini strictly requires functionResponse.response to be an object (not primitive or array)
      if (typeof responseData !== 'object' || responseData === null || Array.isArray(responseData)) {
        responseData = { result: responseData };
      }

      // Prioritize explicit tool_name if provided
      let functionName = msg.tool_name || msg.name;

      if (!functionName) {
        // Try to extract function name from tool_call_id format "call_functionName" or "call_functionName_idx"
        const rawId = msg.tool_call_id || '';
        const match = rawId.match(/^call_([a-zA-Z0-9_-]+?)(?:_\d+)?$/);
        if (match) {
          functionName = match[1];
        } else if (rawId.startsWith('call_')) {
          functionName = rawId.replace('call_', '');
        }
      }

      // Backwards fallback: look for preceding model message functionCall
      if (!functionName || functionName === 'unknown') {
        for (let i = contents.length - 1; i >= 0; i--) {
          const prevMsg = contents[i];
          if (prevMsg.role === 'model' && prevMsg.parts) {
            for (const part of prevMsg.parts) {
              if (part.functionCall?.name) {
                functionName = part.functionCall.name;
                break;
              }
            }
            if (functionName) break;
          }
        }
      }

      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: functionName || 'unknown_tool',
            response: responseData
          }
        }]
      });
      continue;
    }
  }

  return { systemInstruction, contents };
}

/**
 * Convert Gemini response to OpenAI-compatible format.
 * This ensures aiAgent.js doesn't need any changes.
 */
function convertGeminiResponseToOpenAI(geminiResponse) {
  const candidate = geminiResponse.candidates?.[0];
  if (!candidate) {
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: 'I apologize, but I could not generate a response. Please try again.'
        }
      }]
    };
  }

  const parts = candidate.content?.parts || [];
  const message = { role: 'assistant' };

  // Check for function calls
  const functionCalls = parts.filter(p => p.functionCall);
  if (functionCalls.length > 0) {
    message.tool_calls = functionCalls.map((p, idx) => ({
      id: `call_${p.functionCall.name}_${idx}`,
      type: 'function',
      function: {
        name: p.functionCall.name,
        arguments: JSON.stringify(p.functionCall.args || {})
      }
    }));
    // Gemini may also include text alongside function calls
    const textParts = parts.filter(p => p.text);
    message.content = textParts.map(p => p.text).join('\n') || null;
  } else {
    // Plain text response
    const textParts = parts.filter(p => p.text);
    message.content = textParts.map(p => p.text).join('\n') || '';
  }

  return {
    choices: [{ message }]
  };
}

/**
 * Main entry point — drop-in replacement for callNvidiaChatCompletions.
 * Accepts the same parameters and returns the same OpenAI-compatible response shape.
 */
async function callGeminiChatCompletions({
  messages,
  tools = null,
  toolChoice = 'auto',
  temperature = 0.3,
  maxTokens = 1024,
  timeoutMs = null
}) {
  const genai = getGenAI();
  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const timeout = timeoutMs || parseInt(process.env.AI_REQUEST_TIMEOUT_MS, 10) || 30000;

  async function executeRequest(modelName, isFallback = false) {
    const { systemInstruction, contents } = convertMessagesToGemini(messages);
    const geminiTools = convertToolsToGeminiFormat(tools);

    const config = {
      temperature,
      maxOutputTokens: maxTokens,
    };

    if (geminiTools) {
      config.tools = geminiTools;
    }

    // Create a timeout race
    const effectiveTimeout = isFallback ? 30000 : Math.min(timeout, 30000);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error(`AI request timed out after ${effectiveTimeout}ms.`);
        err.code = 'AI_TIMEOUT';
        reject(err);
      }, effectiveTimeout);
    });

    try {
      const generatePromise = genai.models.generateContent({
        model: modelName,
        contents,
        config: {
          ...config,
          systemInstruction: systemInstruction || undefined,
        }
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);

      // Convert to OpenAI format for backward compatibility with aiAgent.js
      return convertGeminiResponseToOpenAI(response);

    } catch (err) {
      // Rate limit handling
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('rate limit')) {
        if (!isFallback && modelName !== FALLBACK_MODEL) {
          console.warn(`[Gemini] ${modelName} rate limited. Retrying with fallback model ${FALLBACK_MODEL}...`);
          return await executeRequest(FALLBACK_MODEL, true);
        }
        const rateLimitErr = new Error('Google Gemini AI rate limit exceeded.');
        rateLimitErr.code = 'AI_RATE_LIMIT';
        rateLimitErr.statusCode = 429;
        throw rateLimitErr;
      }

      // Server errors — try fallback
      if (
        (err.status === 503 || err.status === 500 || err.code === 'AI_TIMEOUT') &&
        !isFallback &&
        modelName !== FALLBACK_MODEL
      ) {
        console.warn(`[Gemini] ${modelName} error (${err.status || err.code}). Retrying with fallback model ${FALLBACK_MODEL}...`);
        return await executeRequest(FALLBACK_MODEL, true);
      }

      throw err;
    }
  }

  return await executeRequest(primaryModel, false);
}

module.exports = {
  callGeminiChatCompletions,
  convertToolsToGeminiFormat,
  convertMessagesToGemini,
  convertGeminiResponseToOpenAI,
  DEFAULT_MODEL,
  FALLBACK_MODEL
};
