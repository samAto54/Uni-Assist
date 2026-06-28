/**
 * server/grok.js
 * Minimal Grok (xAI) Chat client wrapper.
 *
 * This file implements a lightweight HTTP wrapper that calls a configurable
 * Grok-compatible endpoint. It treats authentication failures as hard errors
 * and other availability errors as "quota/availability" so the caller can
 * fall back to the next provider.
 */

const DEFAULT_GROK_URL = 'https://api.grok.ai/v1/chat/completions';
const DEFAULT_MODEL = 'grok-1';

async function callGrok({ systemPrompt, userPrompt, history = [] }) {
  const apiKey = (process.env.GROK_API_KEY || '').trim();
  const apiUrl = (process.env.GROK_API_URL || DEFAULT_GROK_URL).trim();
  const model  = (process.env.GROK_MODEL || DEFAULT_MODEL).trim();

  if (!apiKey || apiKey === 'YOUR_GROK_API_KEY_HERE') {
    console.warn('[Grok] No API key configured.');
    const err = new Error('GROK_NOT_CONFIGURED');
    err.isQuotaError = true; // let caller fall back
    throw err;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-20),
    { role: 'user', content: userPrompt },
  ];

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 700 }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      const msg = errBody?.error?.message || `HTTP ${resp.status}`;

      if (resp.status === 401 || resp.status === 403) {
        // Bad credentials — surface as hard error
        throw new Error(`Grok API key invalid or unauthorized (${resp.status}): ${msg}`);
      }

      // Treat 402/429/5xx as availability/quota so caller will try next provider
      const err = new Error(`Grok unavailable: ${msg}`);
      err.isQuotaError = true;
      throw err;
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || data.result || '';

    if (!content) {
      const err = new Error('Grok returned empty response');
      err.isQuotaError = true;
      throw err;
    }

    console.log('[Grok] Success — model:', model);
    return content;
  } catch (err) {
    if (err.message?.includes('401') || err.message?.includes('403')) throw err;
    if (!err.isQuotaError) err.isQuotaError = true;
    throw err;
  }
}

module.exports = { callGrok };
