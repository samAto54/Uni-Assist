const path = require('path');
const fs = require('fs');

const JSON_PATH = path.join(__dirname, '..', 'assets', 'campus_quick_answers.json');

let cached = null;
let cachedMatchers = null;

function loadQuickAnswers() {
    if (cached) return cached;
    try {
        cached = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    } catch {
        cached = [];
    }
    return cached;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadQuickAnswerMatchers() {
    if (cachedMatchers) return cachedMatchers;
    const answers = loadQuickAnswers();
    cachedMatchers = answers.map((qa) => {
        const pattern = (qa.patterns || [])
            .filter(Boolean)
            .map((p) => escapeRegex(String(p).toLowerCase()))
            .join('|');
        return {
            ...qa,
            matcher: pattern ? new RegExp(`(?:${pattern})`) : null,
        };
    });
    return cachedMatchers;
}

function checkQuickAnswer(message) {
    const lower = (message || '').toLowerCase();
    for (const qa of loadQuickAnswerMatchers()) {
        if (qa.matcher?.test(lower)) {
            return { reply: qa.reply, location: qa.location ?? null };
        }
    }
    return null;
}

module.exports = { checkQuickAnswer };
