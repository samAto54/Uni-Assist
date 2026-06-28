const MODELS_JSON = [
  'gemini-flash-latest',       // working free tier fallback
  'gemini-flash-lite-latest',  // working free tier fallback
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

// When you upgrade to a paid Gemini key, replace the list above with:
// const MODELS_JSON = [
//   'gemini-2.5-pro',          // best quality
//   'gemini-2.5-flash',        // fast + smart
//   'gemini-2.0-flash',        // reliable fallback
// ];

const MODELS_TEXT = [];
const MODELS_TEXT_SET = new Set(MODELS_TEXT);

/**
 * Calls the Google Gemini API with fallback support.
 * @param {string} systemPrompt - Grounding instructions
 * @param {string} userPrompt - The user's query
 */
async function callGemini({ systemPrompt, userPrompt }) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('[Gemini] No valid API key found in environment.');
    return JSON.stringify({
      reply: "AI service is currently in demo mode. Please configure a valid API key.",
      location: null
    });
  }

  const allModels = [...MODELS_JSON, ...MODELS_TEXT];

  async function tryModelAt(index) {
    const modelName = allModels[index];
    try {
      // Use v1beta API endpoint
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const isLegacyModel = MODELS_TEXT_SET.has(modelName);
      
      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: isLegacyModel ? `${systemPrompt}\n\nUser Question: ${userPrompt}` : userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
        },
      };

      if (!isLegacyModel) {
        requestBody.systemInstruction = {
          parts: [{ text: systemPrompt }]
        };
        requestBody.generationConfig.response_mime_type = "application/json";
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Gemini API key is invalid or lacks permission (403)');
        }
        // 429 = rate limited — log it but fall through to next model
        const errorData = await response.json().catch(() => ({}));
        console.error(`Gemini API Error [${modelName}]:`, response.status, JSON.stringify(errorData));
        throw new Error(`Model ${modelName} failed with status ${response.status}`);
      }

      const data = await response.json();
      
      const candidate = data.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error('Safety block — trying next model');
      }

      const reply = candidate?.content?.parts?.[0]?.text || '';
      
      if (!reply) throw new Error(`Empty response from model: ${modelName}`);
      
      console.log(`[Gemini] Successfully used model: ${modelName}`);
      return reply;

    } catch (err) {
      // Log the real error to the server console for debugging
      console.error(`[Gemini Fallback] Attempt with ${modelName} failed:`, err.message);
      
      if (err.message.includes('(403)')) {
        throw err;
      }

      // If we've exhausted all models, throw a user-friendly error
      if (index >= allModels.length - 1) {
        throw new Error("AI_SERVICE_TEMPORARILY_UNAVAILABLE");
      }
      // Otherwise, proceed to the next model
      return tryModelAt(index + 1);
    }
  }

  return tryModelAt(0);
}

module.exports = {
  callGemini,
};