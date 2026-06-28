/**
 * server/deepseek.js
 * DeepSeek Chat Completions client (OpenAI-compatible API).
 * Used as the PRIMARY AI provider before OpenAI and Gemini.
 *
 * API docs: https://platform.deepseek.com/api-docs
 * Model:    deepseek-chat  (DeepSeek-V3 — fast, cheap, highly capable)
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL   = 'deepseek-chat';

/**
 * Call the DeepSeek Chat Completions API.
 *
 * @param {string} systemPrompt  - System instruction
 * @param {string} userPrompt    - Current user message + knowledge context
 * @param {Array}  history       - Prior turns: [{role:'user'|'assistant', content:'...'}]
 * @returns {string}             - JSON string: {"reply":"...","location":"..."}
 */
async function callDeepSeek({ systemPrompt, userPrompt, history = [] }) {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();

  if (!apiKey || apiKey === 'YOUR_DEEPSEEK_API_KEY_HERE') {
    console.warn('[DeepSeek] No API key configured.');
    const err = new Error('DEEPSEEK_NOT_CONFIGURED');
    err.isQuotaError = true; // treat as quota so caller falls back to OpenAI
    throw err;
  }

  // Build messages: [system] → [history (last 20)] → [current user message]
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-20),
    { role: 'user', content: userPrompt },
  ];

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.2,      // low = factual, consistent
        max_tokens: 700,
        response_format: { type: 'json_object' }, // always returns valid JSON
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody?.error?.message || `HTTP ${response.status}`;

      if (response.status === 401) {
        throw new Error(`DeepSeek API key invalid or expired (401): ${msg}`);
      }
      if (response.status === 402) {
        // Insufficient balance — treat as quota exhausted so we fall back
        const err = new Error('DEEPSEEK_QUOTA_EXHAUSTED');
        err.isQuotaError = true;
        throw err;
      }
      if (response.status === 429) {
        console.warn('[DeepSeek] Rate limited (429) — falling back.');
        const err = new Error('DEEPSEEK_RATE_LIMITED');
        err.isQuotaError = true;
        throw err;
      }

      console.error(`[DeepSeek] Error (${response.status}):`, msg);
      const err = new Error(`DeepSeek returned ${response.status}: ${msg}`);
      err.isQuotaError = true; // fall back on any server error
      throw err;
    }

    const data    = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      const err = new Error('DeepSeek returned empty response');
      err.isQuotaError = true;
      throw err;
    }

    console.log(`[DeepSeek] Success — model: ${DEEPSEEK_MODEL}, tokens: ${data.usage?.total_tokens || '?'}`);
    return content;

  } catch (err) {
    // Re-throw auth errors immediately (don't fall back)
    if (err.message?.includes('401')) throw err;
    // For everything else, mark as quota/availability so caller tries next provider
    if (!err.isQuotaError) {
      err.isQuotaError = true;
    }
    throw err;
  }
}

module.exports = { callDeepSeek };
