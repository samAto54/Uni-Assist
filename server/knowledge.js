const fs = require('fs/promises');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── File paths ────────────────────────────────────────────────────────────────
const JSON_PATH    = path.join(__dirname, '..', 'assets', 'handbook_knowledge.json');
const ACADEMIC_MD  = path.join(__dirname, '..', 'assets', 'gimpa_academic_info.md');

// ── Stopwords (skip these when tokenising) ────────────────────────────────────
const STOPWORDS = new Set([
  'the','and','for','are','but','not','you','all','can','was','one','our',
  'out','day','get','has','how','its','may','new','now','see','two','way',
  'who','did','what','when','with','this','that','have','from','they','will',
  'your','said','each','she','which','their','there','been','just','like',
  'about','could','would','should','into','than','then','some','more','also',
  'very','well','help','need','know','please','want','tell','explain',
]);

function tokenize(text) {
  return [...new Set(
    (text || '').toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length > 2 && !STOPWORDS.has(t))
  )];
}

function hasAnyTokenMatch(haystackTokens, needleTokens) {
  for (const token of needleTokens) {
    if (haystackTokens.has(token)) return true;
  }
  return false;
}

// ── Score an entry against query tokens ──────────────────────────────────────
function scoreEntry(entry, tokens) {
  let score = 0;
  const tagTokens = tokenize((entry.tags || []).join(' '));
  const sectionTokens = tokenize(entry.section || '');
  const contentTokens = tokenize(entry.content || '');
  const tagSet = new Set(tagTokens);
  const sectionSet = new Set(sectionTokens);
  const contentSet = new Set(contentTokens);

  for (const token of tokens) {
    if (tagSet.has(token)) score += 4;      // tag match = highest signal
    if (sectionSet.has(token)) score += 3;  // section title match
    if (contentSet.has(token)) score += 2;  // content match
  }
  return score;
}

// ── Parse the academic info markdown into knowledge entries ───────────────────
function parseMdToEntries(mdText) {
  const entries = [];
  const lines = mdText.split('\n');
  let currentSection = 'General';
  let buffer = [];

  const flush = () => {
    const content = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (content.length > 40) {
      entries.push({
        source: 'gimpa_academic_info.md',
        section: currentSection,
        content,
        tags: deriveTagsFromSection(currentSection, content),
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      flush();
      currentSection = trimmed.replace(/^#+\s*/, '');
    } else if (trimmed.startsWith('# ')) {
      flush();
      currentSection = trimmed.replace(/^#\s*/, '');
    } else {
      buffer.push(trimmed);
      // Flush every ~300 chars to keep chunks manageable
      if (buffer.join(' ').length > 300) flush();
    }
  }
  flush();
  return entries;
}

function deriveTagsFromSection(section, content) {
  const combinedTokens = new Set(tokenize(`${section} ${content}`));
  const tagMap = {
    admission:    ['admission', 'apply', 'entry', 'requirement', 'enroll'],
    fees:         ['fee', 'tuition', 'payment', 'cost', 'refund'],
    grading:      ['grade', 'gpa', 'cgpa', 'score', 'mark', 'result'],
    exam:         ['exam', 'examination', 'assessment', 'test', 'quiz'],
    graduation:   ['graduation', 'graduate', 'degree', 'award', 'certificate'],
    library:      ['library', 'book', 'resource', 'reading'],
    clinic:       ['clinic', 'health', 'medical', 'doctor'],
    schedule:     ['schedule', 'timetable', 'class', 'lecture', 'session'],
    discipline:   ['discipline', 'misconduct', 'sanction', 'violation', 'penalty'],
    withdrawal:   ['withdrawal', 'defer', 'suspend', 'leave'],
    programs:     ['program', 'programme', 'course', 'bsc', 'mba', 'llb', 'phd'],
    contact:      ['contact', 'phone', 'email', 'office', 'address'],
    location:     ['location', 'building', 'block', 'hall', 'campus', 'room'],
  };

  const tags = [];
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (hasAnyTokenMatch(combinedTokens, new Set(keywords.map((kw) => kw.toLowerCase())))) tags.push(tag);
  }
  return tags;
}

// ── Built-in GIMPA knowledge (always available, no DB/file needed) ────────────
const BUILTIN_KNOWLEDGE = [
  // ── Campus contacts ──────────────────────────────────────────────────────
  {
    source: 'GIMPA Campus Info',
    section: 'Emergency & Security Contacts',
    content: 'GIMPA Security: 030-274-6882 (24/7 Campus Patrol). University Medical Centre / Clinic: 030-274-6001 (Urgent Care & First Aid). Student Support Services / Counseling: 030-274-6830. Main switchboard: 030-274-6000.',
    tags: ['contact', 'emergency', 'security', 'clinic', 'health', 'phone'],
  },
  {
    source: 'GIMPA Campus Info',
    section: 'Library Hours',
    content: 'The GIMPA Library is open Monday to Friday 8:00 AM to 10:00 PM, and Saturday 8:00 AM to 4:00 PM. During examination periods, hours are extended to midnight on weekdays, 8 AM to 4 PM on Saturdays, and 2 PM to 8 PM on Sundays. The library is closed on public holidays.',
    tags: ['library', 'hours', 'schedule', 'exam'],
  },
  {
    source: 'GIMPA Campus Info',
    section: 'Campus Locations & Buildings',
    content: 'Main Administration Block: central administrative offices, Rector\'s office, Registry. Executive Conference Centre (ECC): conferences, events, seminars. Business School: GIMPA Business School lectures and offices. Faculty of Law: law lectures and moot court. School of Technology (SOT): IT and computer science labs and lectures. GIMPA Library: main library building opposite CBG bank. Greenhill Cafeteria: student dining. Hawa Yakubu Hostel: student accommodation. Campus Clinic: student health services. GIMPA Junction (Main Gate): main entrance off Legon Bypass.',
    tags: ['location', 'building', 'campus', 'map', 'navigate'],
  },
  {
    source: 'GIMPA Campus Info',
    section: 'Wi-Fi & IT Services',
    content: 'GIMPA provides campus-wide Wi-Fi. Students can access the network using their student credentials. The IT helpdesk is located in the School of Technology building. For password resets or connectivity issues, visit the IT office during working hours (8 AM – 5 PM weekdays).',
    tags: ['wifi', 'internet', 'it', 'technology', 'password'],
  },
  // ── Academic calendar ────────────────────────────────────────────────────
  {
    source: 'GIMPA Academic Calendar 2025-2026',
    section: 'Semester Dates',
    content: 'First Semester: September to January. Second Semester: February to June. Examination periods typically fall in December/January (Semester 1) and May/June (Semester 2). Registration for each semester opens approximately 4 weeks before semester start.',
    tags: ['calendar', 'semester', 'schedule', 'exam', 'registration'],
  },
  // ── Grading ──────────────────────────────────────────────────────────────
  {
    source: 'GIMPA Handbook',
    section: 'Grading Scale',
    content: 'GIMPA undergraduate grading: A+ = 80-100% (Excellent, GPA 4.0), A = 70-79% (Very Good, GPA 3.5), B+ = 65-69% (Good, GPA 3.0), B = 60-64% (Above Average, GPA 2.5), C+ = 55-59% (Average, GPA 2.0), C = 50-54% (Pass, GPA 1.5), D = 40-49% (Marginal Pass, GPA 1.0), F = 0-39% (Fail, GPA 0.0). Courses are weighted 60% examination and 40% continuous assessment.',
    tags: ['grading', 'grade', 'gpa', 'cgpa', 'score', 'result', 'exam'],
  },
  {
    source: 'GIMPA Handbook',
    section: 'Academic Standing & Probation',
    content: 'Students who fail two courses or accumulate two retakes are placed on academic probation. Failing three or more courses in a semester may require repeating that semester. Students must maintain a minimum CGPA of 1.0 for undergraduate programmes and 2.5 for postgraduate programmes to remain in good standing.',
    tags: ['probation', 'standing', 'fail', 'retake', 'cgpa'],
  },
  // ── Fees ─────────────────────────────────────────────────────────────────
  {
    source: 'GIMPA Handbook',
    section: 'Tuition Fee Refunds',
    content: 'Tuition fee refund requests must be submitted in writing within 28 days of semester start (or 14 days for modular/session programmes). Commitment fees paid by fresh students are non-refundable. Students dismissed for misconduct are not entitled to any refund.',
    tags: ['fees', 'tuition', 'refund', 'payment', 'withdrawal'],
  },
  {
    source: 'GIMPA Handbook',
    section: 'Application Fees',
    content: 'Application fees: Bachelor\'s/Diploma programmes GHc 200. Master\'s/Postgraduate Diploma GHc 250. Master of Laws (LLM) GHc 360. Post-First Degree LLB GHc 350. Doctorate/PhD GHc 450.',
    tags: ['fees', 'application', 'admission', 'cost'],
  },
  // ── 2024/2025 Tuition Fees — Local Students ───────────────────────────────
  {
    source: 'GIMPA Fees Schedule 2024-2025',
    section: 'Tuition Fees 2024/2025 — Local Students (GHS)',
    content: 'GIMPA 2024/2025 tuition fees for LOCAL (Ghanaian) students in Ghana Cedis (GHS): ' +
      '1. Diploma programme: Semester 1 GHS 3,715 + Semester 2 GHS 3,715 = Total GHS 7,430. ' +
      '2. All Undergraduate programmes (except Law): Semester 1 GHS 5,615 + Semester 2 GHS 5,615 = Total GHS 11,230. ' +
      '3. Faculty of Law Undergraduate Day: Semester 1 GHS 7,475 + Semester 2 GHS 7,475 = Total GHS 14,950. ' +
      '4. Faculty of Law Undergraduate Evening: Semester 1 GHS 9,790 + Semester 2 GHS 9,790 = Total GHS 19,580. ' +
      '5. Faculty of Law One Year Masters: Semester 1 GHS 15,890 + Semester 2 GHS 10,690 = Total GHS 26,580. ' +
      '6. All 6-Month Postgraduate programmes: GHS 9,190 (one payment). ' +
      '7. All One Year Postgraduate Diploma: Semester 1 GHS 6,690 + Semester 2 GHS 6,690 = Total GHS 13,380. ' +
      '8. All One Year Trimester Masters: Trimester 1 GHS 13,190 + Trimester 2 GHS 6,690 + Trimester 3 GHS 6,500 = Total GHS 26,380. ' +
      '9. All One Year Quarterly Masters: Quarter 1 GHS 10,590 + Quarter 2 GHS 7,990 + Quarter 3 GHS 7,800 = Total GHS 26,380. ' +
      '10. All Two Year Trimester Masters: Trimester 1 GHS 10,690 + Trimester 2 GHS 5,440 + Trimester 3 GHS 5,250 = Total GHS 21,380. ' +
      '11. All Two Year Regular Masters (MBA etc.): Semester 1 GHS 12,790 + Semester 2 GHS 8,590 = Total GHS 21,380. ' +
      '12. All Two Year Modular Masters: Session 1 GHS 13,555 + Session 2 GHS 9,355 = Total GHS 22,910. ' +
      '13. All PhD programmes: Semester 1 GHS 21,190 + Semester 2 GHS 14,190 = Total GHS 35,380. ' +
      '14. Doctor of Management (DMGT): Semester 1 GHS 26,700 + Semester 2 GHS 26,700 = Total GHS 53,400.',
    tags: ['fees', 'tuition', 'cost', 'local', 'ghanaian', 'ghs', 'undergraduate', 'masters', 'phd', 'diploma', 'mba', 'law', '2024', '2025'],
  },
  // ── 2024/2025 Tuition Fees — West Africa Foreign Students ────────────────
  {
    source: 'GIMPA Fees Schedule 2024-2025',
    section: 'Tuition Fees 2024/2025 — West Africa Foreign Students (USD)',
    content: 'GIMPA 2024/2025 tuition fees for WEST AFRICA foreign students in US Dollars (USD): ' +
      '1. Diploma programme: USD 720 + USD 720 = Total USD 1,440. ' +
      '2. All Undergraduate programmes (except Law): USD 1,125 + USD 1,125 = Total USD 2,250. ' +
      '3. Faculty of Law Undergraduate Day & Evening: USD 1,750 + USD 1,750 = Total USD 3,500. ' +
      '4. Faculty of Law One Year Masters: USD 3,060 + USD 2,060 = Total USD 5,120. ' +
      '5. All 6-Month Postgraduate programmes: USD 1,690 (one payment). ' +
      '6. All One Year Postgraduate Diploma: USD 1,480 + USD 1,000 = Total USD 2,480. ' +
      '7. All One Year Trimester Masters: USD 2,540 + USD 1,290 + USD 1,250 = Total USD 5,080. ' +
      '8. All One Year Quarterly Masters: USD 2,540 + USD 1,290 + USD 1,250 = Total USD 5,080. ' +
      '9. All Two Year Trimester Masters: USD 2,040 + USD 1,040 + USD 1,000 = Total USD 4,080. ' +
      '10. All Two Year Regular Masters: USD 2,440 + USD 1,640 = Total USD 4,080. ' +
      '11. All Two Year Modular Masters: USD 2,440 + USD 1,640 = Total USD 4,080.',
    tags: ['fees', 'tuition', 'cost', 'foreign', 'international', 'west africa', 'usd', 'dollar', 'undergraduate', 'masters', 'diploma', '2024', '2025'],
  },
  // ── 2024/2025 Tuition Fees — All Other International Students ────────────
  {
    source: 'GIMPA Fees Schedule 2024-2025',
    section: 'Tuition Fees 2024/2025 — All Other International Students (USD)',
    content: 'GIMPA 2024/2025 tuition fees for ALL OTHER INTERNATIONAL students (non-West Africa) in US Dollars (USD): ' +
      '1. Diploma programme: USD 980 + USD 980 = Total USD 1,960. ' +
      '2. All Undergraduate programmes (except Law): USD 1,730 + USD 1,730 = Total USD 3,460. ' +
      '3. Faculty of Law Undergraduate Day & Evening: USD 2,550 + USD 2,550 = Total USD 5,100. ' +
      '4. Faculty of Law One Year Masters: USD 3,060 + USD 2,060 = Total USD 5,120. ' +
      '5. All 6-Month Postgraduate programmes: USD 2,540 (one payment). ' +
      '6. All One Year Postgraduate Diploma: USD 2,140 + USD 1,440 = Total USD 3,580. ' +
      '7. All One Year Trimester Masters: USD 3,740 + USD 1,890 + USD 1,850 = Total USD 7,480. ' +
      '8. All One Year Quarterly Masters: USD 3,740 + USD 1,890 + USD 1,850 = Total USD 7,480. ' +
      '9. All Two Year Trimester Masters: USD 3,190 + USD 1,615 + USD 1,575 = Total USD 6,380. ' +
      '10. All Two Year Regular Masters: USD 3,820 + USD 2,560 = Total USD 6,380. ' +
      '11. All Two Year Modular Masters: USD 3,820 + USD 2,560 = Total USD 6,380.',
    tags: ['fees', 'tuition', 'cost', 'foreign', 'international', 'usd', 'dollar', 'undergraduate', 'masters', 'diploma', '2024', '2025'],
  },
  // ── Quick fee lookup summary ───────────────────────────────────────────────
  {
    source: 'GIMPA Fees Schedule 2024-2025',
    section: 'Fee Summary — Quick Reference 2024/2025',
    content: 'Quick fee reference for GIMPA 2024/2025: ' +
      'Undergraduate (local, except Law): GHS 11,230/year. ' +
      'Undergraduate Law Day (local): GHS 14,950/year. ' +
      'Undergraduate Law Evening (local): GHS 19,580/year. ' +
      'MBA / Two Year Regular Masters (local): GHS 21,380/year. ' +
      'One Year Masters (local): GHS 26,380/year. ' +
      'PhD (local): GHS 35,380/year. ' +
      'Doctor of Management (local): GHS 53,400/year. ' +
      'Undergraduate (West Africa foreign): USD 2,250/year. ' +
      'Undergraduate (other international): USD 3,460/year. ' +
      'These are 2024/2025 continuing student fees. Fresh student fees may differ slightly.',
    tags: ['fees', 'tuition', 'cost', 'how much', 'price', 'undergraduate', 'masters', 'mba', 'phd', 'law', '2024', '2025', 'ghs', 'usd'],
  },
  // ── Admission ────────────────────────────────────────────────────────────
  {
    source: 'GIMPA Academic Info',
    section: 'Undergraduate Admission Requirements',
    content: 'WASSCE candidates need credit passes (A1-C6) in six subjects including English Language and Mathematics (mandatory) plus three relevant electives. SSSCE candidates need credit passes (A-D) in six subjects including core English and Mathematics. GCE A-Level: passes in at least three subjects plus five O-Level credits including English and Mathematics. HND holders may be admitted to Level 200 or 300 based on performance.',
    tags: ['admission', 'requirement', 'wassce', 'sssce', 'undergraduate', 'entry'],
  },
  {
    source: 'GIMPA Academic Info',
    section: 'Postgraduate Admission Requirements',
    content: 'Master\'s programmes require a Bachelor\'s degree with minimum Second Class Lower Division. Some programmes require minimum GPA of 3.3. Professional experience required for executive programmes (typically 3-5 years). PhD requires a Master\'s degree, strong academic record, research proposal, and interview. Letters of recommendation (2-3), CV, and personal statement required for all postgraduate applications.',
    tags: ['admission', 'postgraduate', 'masters', 'phd', 'requirement'],
  },
  {
    source: 'GIMPA Academic Info',
    section: 'Mature Student Admission',
    content: 'Mature student route is available for applicants who are at least 25 years old, have completed SHS/SSS or equivalent, can provide proof of age, and pass the GIMPA Mature Programme entrance examination.',
    tags: ['admission', 'mature', 'age', 'entry'],
  },
  // ── Programmes ───────────────────────────────────────────────────────────
  {
    source: 'GIMPA Academic Info',
    section: 'Undergraduate Programmes Offered',
    content: 'GIMPA offers: BSc Business Administration (specialisations: Accounting, Banking & Finance, HR Management, Marketing, Operations & Project Management, Entrepreneurship). BSc Accounting. BA Public Administration. BSc Economics and Political Science. Bachelor of Laws (LLB). BSc Information Technology. BSc Computer Science. BA Communication Studies. BA Political Science.',
    tags: ['programs', 'programme', 'undergraduate', 'degree', 'bsc', 'llb'],
  },
  {
    source: 'GIMPA Academic Info',
    section: 'Postgraduate Programmes Offered',
    content: 'GIMPA postgraduate programmes: MBA (General), Executive MBA, MSc Finance, MSc Energy Economics, MSc Leadership, MPA (Master of Public Administration), Master of Governance and Leadership, Masters in International Relations and Diplomacy, LLM (Master of Laws), MSc Information Technology, MSc Digital Forensics and Cybersecurity, MSc ICT IT & Law, MA Political Science, MA Development Studies. PhD programmes available across all schools.',
    tags: ['programs', 'postgraduate', 'masters', 'mba', 'mpa', 'llm', 'phd'],
  },
  // ── Examinations ─────────────────────────────────────────────────────────
  {
    source: 'GIMPA Handbook',
    section: 'Examination Eligibility',
    content: 'A student is eligible for examinations only if: (1) registered for the course, (2) fees fully paid, (3) minimum 75% attendance achieved, (4) continuous assessment requirements completed. Students arriving more than 30 minutes late may be refused entry. Student ID must be presented at all examinations.',
    tags: ['exam', 'eligibility', 'attendance', 'fees', 'id'],
  },
  {
    source: 'GIMPA Handbook',
    section: 'Re-sit and Retake Policy',
    content: 'A re-sit is a second attempt at a failed assessment without re-enrolling in the course. A retake requires full re-enrolment and completion of all coursework. Re-sits are not automatic and require prior registration and payment of a fee. The maximum number of retakes is limited by programme regulations.',
    tags: ['resit', 're-sit', 'retake', 'fail', 'exam'],
  },
  {
    source: 'GIMPA Handbook',
    section: 'Results and Remarks',
    content: 'Examination results are published through the student portal at www.gimpa.edu.gh. Feedback and re-mark requests must be submitted within seven calendar days of results publication. Re-mark requests require payment of a fee.',
    tags: ['results', 'remark', 'portal', 'feedback', 'exam'],
  },
  // ── Student services ─────────────────────────────────────────────────────
  {
    source: 'GIMPA Handbook',
    section: 'Student Loan Trust Fund (SLTF)',
    content: 'SLTF loans are available to Ghanaian students enrolled in degree programmes who are in good academic standing, subject to SLTF eligibility criteria. Apply through the SLTF office or online at sltf.gov.gh.',
    tags: ['sltf', 'loan', 'financial', 'aid', 'scholarship'],
  },
  {
    source: 'GIMPA Handbook',
    section: 'Orientation',
    content: 'Orientation is compulsory for all fresh students. Absence from orientation may result in withdrawal of admission. Orientation typically takes place at the start of the first semester in September.',
    tags: ['orientation', 'fresh', 'admission', 'new student'],
  },
  {
    source: 'GIMPA Handbook',
    section: 'Withdrawal and Deferment',
    content: 'A student may apply to withdraw at any time during the semester. Tuition fee refunds for permanent withdrawals are subject to the refund policy. Deferment of admission is allowed for a maximum of one academic year. Students who fail to enroll in the year of admission without formal deferment forfeit their admission.',
    tags: ['withdrawal', 'deferment', 'leave', 'refund'],
  },
  {
    source: 'GIMPA Handbook',
    section: 'Graduation Requirements',
    content: 'To qualify for an undergraduate award, a student must: pass all approved required courses, earn the required minimum credits for the programme, maintain minimum CGPA requirements, complete any required thesis or project, clear all financial obligations, and meet minimum residency requirements. Students must apply to graduate whether attending the ceremony or not.',
    tags: ['graduation', 'graduate', 'degree', 'award', 'credits', 'cgpa'],
  },
  // ── Discipline ───────────────────────────────────────────────────────────
  {
    source: 'GIMPA Handbook',
    section: 'Disciplinary Procedures',
    content: 'Disciplinary procedures include: written complaint submission, investigation by the Student Affairs Committee, hearing with the right to an adviser, and appeal rights. Sanctions range from reprimand and warning to suspension and dismissal, escalating based on severity and repeated offences.',
    tags: ['discipline', 'misconduct', 'sanction', 'hearing', 'suspension', 'dismissal'],
  },
  {
    source: 'GIMPA Handbook',
    section: 'Academic Integrity & Plagiarism',
    content: 'Plagiarism is the appropriation of another person\'s ideas, results, or words without acknowledgement. Research misconduct includes fabrication, falsification, and plagiarism. Violations may result in course failure, suspension, or dismissal. All submitted work must be the student\'s own unless properly cited.',
    tags: ['plagiarism', 'integrity', 'misconduct', 'citation', 'academic'],
  },
];

// ── Supabase loader (with timeout — bad URLs must not block chat) ─────────────
const SUPABASE_LOAD_TIMEOUT_MS = 3000;

async function loadFromSupabase() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const fetchRows = async () => {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('ai_knowledge')
      .select('source, section, content, tags');
    if (error || !data) return [];
    return data;
  };

  try {
    return await Promise.race([
      fetchRows(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase knowledge load timeout')), SUPABASE_LOAD_TIMEOUT_MS)
      ),
    ]);
  } catch (e) {
    console.warn('[Knowledge] Supabase unavailable, using local handbook only.');
    return [];
  }
}

// ── JSON handbook loader ──────────────────────────────────────────────────────
async function loadFromJson() {
  try {
    const raw = await fs.readFile(JSON_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch { return []; }
}

// ── Markdown academic info loader ─────────────────────────────────────────────
async function loadFromMd() {
  try {
    const raw = await fs.readFile(ACADEMIC_MD, 'utf-8');
    return parseMdToEntries(raw);
  } catch { return []; }
}

// ── Cache ─────────────────────────────────────────────────────────────────────
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadKnowledge() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;

  // Load all sources in parallel
  const [remote, json, md] = await Promise.all([
    loadFromSupabase(),
    loadFromJson(),
    loadFromMd(),
  ]);

  // Merge: remote DB > JSON handbook > markdown > built-in
  // Deduplicate by section+content fingerprint
  const seen = new Set();
  const merged = [];

  for (const entry of [...remote, ...json, ...md, ...BUILTIN_KNOWLEDGE]) {
    const key = `${entry.section}|${(entry.content || '').substring(0, 60)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({
        ...entry,
        tags: Array.isArray(entry.tags) ? entry.tags : [],
      });
    }
  }

  console.log(`[Knowledge] Loaded ${merged.length} entries (${remote.length} DB, ${json.length} JSON, ${md.length} MD, ${BUILTIN_KNOWLEDGE.length} built-in)`);
  cache = merged;
  cacheTime = now;
  return merged;
}

// ── User timetable context ────────────────────────────────────────────────────
async function getUserContext(userId, metadata = null) {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const supabase = createClient(url, key);
    let department = metadata?.department;
    let level = metadata?.level;

    if (userId && (!department || !level)) {
      const { data: student } = await supabase
        .from('students').select('department, level').eq('id', userId).single();
      if (student) { department = student.department; level = student.level; }
    }
    if (!department || !level) return null;

    const { data: courses } = await supabase
      .from('courses').select('code, name').eq('department', department).eq('level', level);
    if (!courses || courses.length === 0) return null;

    const codes = courses.map(c => c.code);
    const { data: sessions } = await supabase
      .from('course_sessions').select('course_code, day, time_slot, location').in('course_code', codes);
    if (!sessions || sessions.length === 0) return null;

    const DEPT_LABELS = { cs: 'Computer Science', it: 'Information Technology', mis: 'Management Information Systems' };
    let text = `Student Profile: ${DEPT_LABELS[department] || department} department, Level ${level}.\n`;
    text += `Enrolled courses:\n`;
    courses.forEach(c => { text += `  - ${c.code}: ${c.name}\n`; });
    text += `Timetable:\n`;
    sessions.forEach(s => {
      const course = courses.find(c => c.code === s.course_code);
      text += `  - ${s.day} at ${s.time_slot}: ${course?.name || s.course_code} (${s.course_code}) in ${s.location}\n`;
    });
    return text;
  } catch (e) {
    console.error('[Knowledge] getUserContext:', e.message);
    return null;
  }
}

const VISITOR_EXCLUDED_TAGS = new Set(['schedule', 'programs']);

const VISITOR_EXCLUDED_SECTIONS = [
  'timetable', 'course session', 'enrolled', 'lecturer assignment',
];

function isVisitorSafeEntry(entry) {
  const tags = entry.tags || [];
  if (tags.some(t => VISITOR_EXCLUDED_TAGS.has(t))) return false;
  const section = (entry.section || '').toLowerCase();
  if (VISITOR_EXCLUDED_SECTIONS.some(s => section.includes(s))) return false;
  return true;
}

// ── Main retrieval function ───────────────────────────────────────────────────
async function getRelevantKnowledge(message, userId = null, metadata = null, options = {}) {
  const { visitorMode = false } = options;
  const tokens = tokenize(message);
  let entries = await loadKnowledge();

  if (visitorMode) {
    entries = entries.filter(isVisitorSafeEntry);
  }

  // Score all entries
  const scored = entries
    .map(e => ({ ...e, score: scoreEntry(e, tokens) }))
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score);

  // Take top 5 for richer context
  const top = scored.slice(0, 5);
  let context = top
    .map((e, i) => `[${i + 1}] ${e.section}\n${e.content}`)
    .join('\n\n');

  // Inject personal timetable only for signed-in students
  if (!visitorMode) {
    const scheduleWords = ['schedule', 'class', 'timetable', 'today', 'tomorrow',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'when', 'time', 'lecture'];
    const isScheduleQuery = scheduleWords.some(kw => message.toLowerCase().includes(kw));

    if (isScheduleQuery || top.length === 0) {
      const userCtx = await getUserContext(userId, metadata);
      if (userCtx) {
        context = `STUDENT PERSONAL DATA:\n${userCtx}\n\n${context ? `CAMPUS KNOWLEDGE:\n${context}` : ''}`;
      }
    }
  }

  if (!context) {
    context = 'No specific handbook context matched this query. Respond helpfully as a friendly GIMPA campus assistant using general knowledge about GIMPA.';
  }

  const maxPossible = Math.max(1, tokens.length * 4);
  const confidence = top.length === 0 ? 0 : Math.min(1, top[0].score / maxPossible);

  return { context, top, confidence };
}

module.exports = { getRelevantKnowledge, getUserContext };
