import quickAnswers from '../assets/campus_quick_answers.json';

// If the message contains any of these words, skip quick answers entirely
// and let the AI handle it — these questions need context-aware answers.
const AI_OVERRIDE_PATTERNS = [
  'how much', 'fee', 'fees', 'cost', 'price', 'pay', 'payment', 'tuition',
  'how do i', 'can i', 'should i', 'what should', 'what do i',
  'why', 'explain', 'difference between', 'compare',
  'level 100', 'level 200', 'level 300', 'level 400',
  'first year', 'second year', 'third year', 'final year',
  'my ', 'i am', "i'm", 'i have', 'i need', 'i want',
  'help me', 'not sure', "don't know", 'confused',
  'what happens', 'what if', 'is it possible',
];
const AI_OVERRIDE_SET = new Set(AI_OVERRIDE_PATTERNS.map((p) => p.toLowerCase()));
const QUICK_ANSWER_MATCHERS = quickAnswers.map((qa) => ({
  ...qa,
  patternRegex: new RegExp(
    (qa.patterns || [])
      .map((p) => String(p).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')
  ),
}));
const AI_OVERRIDE_REGEX = new RegExp(
  [...AI_OVERRIDE_SET]
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
);

/**
 * Match common GIMPA questions locally — instant, accurate, works offline.
 * Skips matching if the message has fee/cost/personal intent — those go to AI.
 * @returns {{ reply: string, location: string|null } | null}
 */
export function checkCampusQuickAnswer(message) {
    const lower = (message || '').toLowerCase();

    // Let the AI handle anything that needs a contextual or personalised answer
    if (AI_OVERRIDE_REGEX.test(lower)) return null;

    for (const qa of QUICK_ANSWER_MATCHERS) {
      if (qa.patternRegex.test(lower)) {
        return { reply: qa.reply, location: qa.location ?? null };
      }
    }
    return null;
}
