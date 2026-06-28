/**
 * server/openai.js
 * OpenAI Chat Completions client.
 * Supports conversation history for multi-turn memory.
 */

const MODELS = [
  'gpt-4o-mini',   // fast, cheap, highly capable — primary model
  'gpt-4o',        // most capable — used if gpt-4o-mini is unavailable
  'gpt-3.5-turbo', // last resort fallback
];

/**
 * Call the OpenAI Chat Completions API.
 *
 * @param {string}   systemPrompt  - System instruction
 * @param {string}   userPrompt    - Current user message + knowledge context
 * @param {Array}    history       - Prior turns: [{role:'user'|'assistant', content:'...'}]
 * @returns {string}               - JSON string: {"reply":"...","location":"..."}
 */
async function callOpenAI({ systemPrompt, userPrompt, history = [] }) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();

  if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
    console.warn('[OpenAI] No API key configured.');
    return JSON.stringify({
      reply: 'AI service is not configured. Please add your OpenAI API key to the .env file.',
      location: null,
    });
  }

  // Build the messages array:
  // [system] → [history turns] → [current user message]
  const messages = [
    { role: 'system', content: systemPrompt },
    // Inject prior conversation turns for memory (cap at last 10 turns = 20 messages)
    ...history.slice(-20),
    { role: 'user', content: userPrompt },
  ];

  const API_URL = 'https://api.openai.com/v1/chat/completions';

  async function tryModelAt(index) {
    const model = MODELS[index];
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,        // low = more factual, less creative
          max_tokens: 700,
          response_format: { type: 'json_object' }, // always returns valid JSON
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw new Error('OpenAI API key is invalid or expired (401).');
        }
        if (response.status === 429) {
          console.warn(`[OpenAI] ${model} rate-limited — trying next model.`);
          throw new Error(`${model} rate-limited (429)`);
        }

        console.error(`[OpenAI] ${model} error (${response.status}):`, errBody?.error?.message || '');
        throw new Error(`${model} returned ${response.status}`);
      }

      const data    = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      if (!content) throw new Error(`Empty response from ${model}`);

      console.log(`[OpenAI] Success — model: ${model}, tokens: ${data.usage?.total_tokens || '?'}`);
      return content;

    } catch (err) {
      console.error(`[OpenAI] ${model} failed:`, err.message);

      if (err.message.includes('401')) throw err; // hard stop — bad key

      if (index >= MODELS.length - 1) {
        // Tag this as a quota/availability error so the caller can try Gemini
        const err2 = new Error('OPENAI_QUOTA_EXHAUSTED');
        err2.isQuotaError = true;
        throw err2;
      }
      // try next model
      return tryModelAt(index + 1);
    }
  }

  return tryModelAt(0);
}

module.exports = { callOpenAI };
