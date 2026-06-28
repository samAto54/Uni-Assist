require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const mammoth = require('mammoth');
const { getRelevantKnowledge } = require('./knowledge');
const { checkQuickAnswer } = require('./quickAnswers');
const { buildPrompt, buildVisitorPrompt } = require('./prompt');
const { callGrok }             = require('./grok');
const { callDeepSeek }         = require('./deepseek');
const { callOpenAI }           = require('./openai');
const { callGemini }           = require('./gemini');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' })); // allow history payload

// ── Campus location extractor ─────────────────────────────────────────────────
const KNOWN_LOCATIONS = [
  'library', 'main administration block', 'administration block',
  'science hall', 'law faculty', 'faculty of law', 'gimpa clinic',
  'students car park', 'main gate', 'south-eastern gate',
  'executive conference centre', 'business school',
  'school of technology', 'greenhill cafeteria',
  'hawa yakubu hostel', 'graduate lecture block', 'campus clinic',
];

function extractLocation(text) {
  const lower = (text || '').toLowerCase();
  const match = KNOWN_LOCATIONS.find(place => lower.includes(place));
  return match ? match.replace(/\b\w/g, c => c.toUpperCase()) : null;
}

// ── Safe JSON parser ──────────────────────────────────────────────────────────
function parseJson(raw) {
  if (!raw) return { reply: '', location: null };
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const first = raw.indexOf('{');
  const last  = raw.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(raw.slice(first, last + 1)); } catch { /* fall through */ }
  }
  return { reply: raw.trim(), location: null };
}

// ── Words that mean the question needs AI — never intercept these ─────────────
const AI_OVERRIDE_WORDS = [
  'how much', 'fee', 'fees', 'cost', 'price', 'pay', 'payment', 'tuition',
  'how do i', 'can i', 'should i', 'what should', 'what do i',
  'why', 'explain', 'difference between', 'compare',
  'level 100', 'level 200', 'level 300', 'level 400',
  'first year', 'second year', 'third year', 'final year',
  'my ', 'i am', "i'm", 'i have', 'i need', 'i want',
  'help me', 'not sure', "don't know", 'confused',
  'what happens', 'what if', 'is it possible',
];

function shouldSkipQuickAnswer(message) {
  const lower = message.toLowerCase();
  return AI_OVERRIDE_WORDS.some(w => lower.includes(w));
}

// ── Rule-based fast responses loaded from assets/campus_quick_answers.json ──

const VISITOR_COURSE_PATTERNS = [
  'my course', 'my class', 'my timetable', 'my schedule', 'my lecturer',
  'course code', 'course outline', 'syllabus', 'what course', 'which course',
  'enrolled in', 'my grade', 'my gpa', 'my cgpa', 'my results',
  'when is mis', 'when is cs', 'lecturer for', 'who teaches',
];

function checkVisitorBlocked(message) {
  const lower = message.toLowerCase();
  const isCourseQuery = VISITOR_COURSE_PATTERNS.some(p => lower.includes(p));
  if (!isCourseQuery) return null;
  return 'Course and personal academic information is available to signed-in students only. Please log in to Uni-Assist, or contact the GIMPA Registry at 030-274-6000.';
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ ok: true, provider: 'deepseek→grok→openai→gemini', timestamp: new Date().toISOString() })
);

// ── Parse DOCX endpoint ───────────────────────────────────────────────────────
app.post('/api/parse-docx', async (req, res) => {
  try {
    console.log('[Parse DOCX] Request received');
    const { base64, filename } = req.body;
    if (!base64) {
      console.log('[Parse DOCX] Missing base64 data');
      return res.status(400).json({ error: 'base64 data is required' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');
    console.log('[Parse DOCX] Buffer size:', buffer.length);

    // Extract text from .docx using mammoth
    const result = await mammoth.extractRawText({ buffer });
    console.log('[Parse DOCX] Extracted text length:', result.value.length);
    
    res.json({ text: result.value });
  } catch (err) {
    console.error('[Parse DOCX]', err.message);
    res.status(500).json({ error: 'Failed to parse DOCX file' });
  }
});

// ── Chat endpoint ─────────────────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  try {
    // ── 1. Validate input ─────────────────────────────────────────────────
    const message    = (req.body?.message  || '').trim();
    const userId     = req.body?.userId   || null;
    const metadata   = req.body?.metadata || {};
    const visitorMode = req.body?.mode === 'visitor' || req.body?.isVisitor === true;
    // history: array of {role: 'user'|'assistant', content: string}
    const history  = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'message too long (max 2000 chars)' });
    }

    // ── 2. Visitor course-info guard ──────────────────────────────────────
    if (visitorMode) {
      const blocked = checkVisitorBlocked(message);
      if (blocked) {
        return res.json({ reply: blocked, location: null, confidence: 1.0 });
      }
    }

    // ── 3. Rule-based fast path (skip if question needs AI context) ──────
    if (!shouldSkipQuickAnswer(message)) {
      const quick = checkQuickAnswer(message);
      if (quick) {
        console.log('[Chat] Rule-based response served.');
        return res.json({ reply: quick.reply, location: quick.location, confidence: 1.0 });
      }
    }

    // ── 4. Retrieve knowledge (+ user timetable for signed-in students) ───
    const retrieval = await getRelevantKnowledge(
      message,
      visitorMode ? null : userId,
      visitorMode ? null : metadata,
      { visitorMode },
    );
    const context   = retrieval.context ||
      'No specific handbook context matched. Respond helpfully as a GIMPA campus assistant.';

    // ── 5. Build prompts ──────────────────────────────────────────────────
    const { systemPrompt, userPrompt } = visitorMode
      ? buildVisitorPrompt({ message, context })
      : buildPrompt({ message, context });

    // ── 6. Call AI providers: DeepSeek → OpenAI → Gemini ─────────────────
    let parsed;
    try {
      let raw;
      const hasGrok = !!(process.env.GROK_API_KEY &&
        process.env.GROK_API_KEY !== 'YOUR_GROK_API_KEY_HERE');
      const hasDeepSeek = !!(process.env.DEEPSEEK_API_KEY &&
        process.env.DEEPSEEK_API_KEY !== 'YOUR_DEEPSEEK_API_KEY_HERE');
      const hasOpenAI = !!(process.env.OPENAI_API_KEY &&
        process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE');
      const hasGemini = !!(process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE');

      // ── Primary: DeepSeek → Grok → OpenAI → Gemini ────────────────
      if (hasDeepSeek) {
        try {
          raw = await callDeepSeek({ systemPrompt, userPrompt, history });
          console.log('[Chat] Served by DeepSeek (primary)');
        } catch (dsErr) {
          if (!dsErr.isQuotaError) throw dsErr; // auth error — hard stop
          console.warn('[Chat] DeepSeek unavailable, trying Grok fallback...');

          if (hasGrok) {
            try {
              raw = await callGrok({ systemPrompt, userPrompt, history });
              console.log('[Chat] Served by Grok (fallback 1)');
            } catch (grokErr) {
              if (!grokErr.isQuotaError) throw grokErr;
              console.warn('[Chat] Grok unavailable, trying OpenAI fallback...');

              if (hasOpenAI) {
                try {
                  raw = await callOpenAI({ systemPrompt, userPrompt, history });
                  console.log('[Chat] Served by OpenAI (fallback 2)');
                } catch (openAiErr) {
                  if (!openAiErr.isQuotaError &&
                      openAiErr.message !== 'OPENAI_QUOTA_EXHAUSTED' &&
                      openAiErr.message !== 'AI_SERVICE_TEMPORARILY_UNAVAILABLE') {
                    throw openAiErr;
                  }
                  console.warn('[Chat] OpenAI quota exhausted, trying Gemini fallback...');
                  if (!hasGemini) throw new Error('AI_SERVICE_TEMPORARILY_UNAVAILABLE');
                  raw = await callGemini({ systemPrompt, userPrompt });
                  console.log('[Chat] Served by Gemini (fallback 3)');
                }
              } else if (hasGemini) {
                raw = await callGemini({ systemPrompt, userPrompt });
                console.log('[Chat] Served by Gemini (fallback 2)');
              } else {
                throw new Error('AI_SERVICE_TEMPORARILY_UNAVAILABLE');
              }
            }
          } else if (hasOpenAI) {
            try {
              raw = await callOpenAI({ systemPrompt, userPrompt, history });
              console.log('[Chat] Served by OpenAI (fallback 1)');
            } catch (openAiErr) {
              const isQuota = openAiErr.isQuotaError ||
                openAiErr.message === 'OPENAI_QUOTA_EXHAUSTED' ||
                openAiErr.message === 'AI_SERVICE_TEMPORARILY_UNAVAILABLE';
              if (!isQuota) throw openAiErr;
              console.warn('[Chat] OpenAI quota exhausted, trying Gemini fallback...');
              if (!hasGemini) throw new Error('AI_SERVICE_TEMPORARILY_UNAVAILABLE');
              raw = await callGemini({ systemPrompt, userPrompt });
              console.log('[Chat] Served by Gemini (fallback)');
            }
          } else if (hasGemini) {
            raw = await callGemini({ systemPrompt, userPrompt });
            console.log('[Chat] Served by Gemini (fallback 1)');
          } else {
            throw new Error('AI_SERVICE_TEMPORARILY_UNAVAILABLE');
          }
        }
      } else if (hasGrok) {
        // No DeepSeek key — try Grok first
        try {
          raw = await callGrok({ systemPrompt, userPrompt, history });
          console.log('[Chat] Served by Grok (primary)');
        } catch (grokErr) {
          if (!grokErr.isQuotaError) throw grokErr;
          console.warn('[Chat] Grok unavailable, trying OpenAI fallback...');

          if (hasOpenAI) {
            try {
              raw = await callOpenAI({ systemPrompt, userPrompt, history });
              console.log('[Chat] Served by OpenAI (fallback)');
            } catch (openAiErr) {
              const isQuota = openAiErr.isQuotaError ||
                openAiErr.message === 'OPENAI_QUOTA_EXHAUSTED' ||
                openAiErr.message === 'AI_SERVICE_TEMPORARILY_UNAVAILABLE';
              if (!isQuota) throw openAiErr;
              console.warn('[Chat] OpenAI quota exhausted, trying Gemini fallback...');
              if (!hasGemini) throw new Error('AI_SERVICE_TEMPORARILY_UNAVAILABLE');
              raw = await callGemini({ systemPrompt, userPrompt });
              console.log('[Chat] Served by Gemini (fallback)');
            }
          } else if (hasGemini) {
            raw = await callGemini({ systemPrompt, userPrompt });
            console.log('[Chat] Served by Gemini (primary fallback)');
          } else {
            throw new Error('AI_SERVICE_TEMPORARILY_UNAVAILABLE');
          }
        }
      } else if (hasOpenAI) {
        // No DeepSeek or Grok key — try OpenAI directly
        try {
          raw = await callOpenAI({ systemPrompt, userPrompt, history });
          console.log('[Chat] Served by OpenAI (primary)');
        } catch (openAiErr) {
          const isQuota = openAiErr.isQuotaError ||
            openAiErr.message === 'OPENAI_QUOTA_EXHAUSTED' ||
            openAiErr.message === 'AI_SERVICE_TEMPORARILY_UNAVAILABLE';
          if (!isQuota) throw openAiErr;
          console.warn('[Chat] OpenAI quota exhausted, trying Gemini fallback...');
          if (!hasGemini) throw new Error('AI_SERVICE_TEMPORARILY_UNAVAILABLE');
          raw = await callGemini({ systemPrompt, userPrompt });
          console.log('[Chat] Served by Gemini (fallback)');
        }
      } else if (hasGemini) {
        raw = await callGemini({ systemPrompt, userPrompt });
        console.log('[Chat] Served by Gemini (primary)');
      } else {
        throw new Error('No AI provider configured. Add GROK_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY to .env');
      }

      parsed = parseJson(raw);
    } catch (err) {
      console.error('[Chat] AI provider error:', err.message);

      const friendly =
        err.message === 'AI_SERVICE_TEMPORARILY_UNAVAILABLE'
          ? 'The AI service is temporarily unavailable. Please try again in a moment.'
          : err.message.includes('401')
            ? 'AI service is not configured. Please check the OpenAI API key in .env.'
            : "I'm having trouble reaching Uni-Assist right now. Please try again.";

      return res.json({
        reply:      friendly,
        location:   extractLocation(context),
        confidence: Number(retrieval.confidence.toFixed(2)),
      });
    }

    // ── 7. Build response ─────────────────────────────────────────────────
    const replyText = (typeof parsed.reply === 'string' && parsed.reply.trim())
      ? parsed.reply.trim()
      : "I don't have enough campus information to answer that. Please contact the GIMPA Registry or visit www.gimpa.edu.gh.";

    const location = parsed.location ||
      extractLocation(`${replyText}\n${context}`);

    return res.json({
      reply:      replyText,
      location,
      confidence: Number(retrieval.confidence.toFixed(2)),
    });

  } catch (err) {
    console.error('[Chat] Unhandled error:', err.message);
    return res.status(500).json({
      reply:      "I'm having trouble processing your request. Please try again.",
      location:   null,
      confidence: 0,
    });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const hasGrok = !!process.env.GROK_API_KEY &&
    process.env.GROK_API_KEY !== 'YOUR_GROK_API_KEY_HERE';
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY &&
    process.env.DEEPSEEK_API_KEY !== 'YOUR_DEEPSEEK_API_KEY_HERE';
  const hasOpenAI = !!process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE';
  const hasGemini = !!process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE';
  console.log(`[Uni-Assist] Server running on port ${PORT} (all interfaces)`);
  console.log(`[Uni-Assist] DeepSeek key: ${hasDeepSeek ? 'CONFIGURED ✓ (primary)'   : 'not set'}`);
  console.log(`[Uni-Assist] Grok key:    ${hasGrok    ? 'CONFIGURED ✓ (fallback 1)' : 'not set'}`);
  console.log(`[Uni-Assist] OpenAI key:   ${hasOpenAI  ? 'CONFIGURED ✓ (fallback 2)' : 'not set'}`);
  console.log(`[Uni-Assist] Gemini key:   ${hasGemini  ? 'CONFIGURED ✓ (fallback 3)' : 'not set'}`);
  console.log(`[Uni-Assist] Health:       http://localhost:${PORT}/health`);
});
