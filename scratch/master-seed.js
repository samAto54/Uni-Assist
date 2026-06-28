const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function fullSeed() {
  console.log('Starting Master Data Seed...');

  const departments = ['cs', 'it', 'mis'];
  const levels = ['100', '200', '300', '400'];

  const courseTemplates = {
    'cs': {
      '100': [{c:'CSCI 101', n:'Intro to Programming'}, {c:'MATH 101', n:'Calculus I'}, {c:'CSCI 103', n:'Digital Logic'}],
      '200': [{c:'CSCI 201', n:'Data Structures'}, {c:'CSCI 203', n:'Object Oriented Programming'}, {c:'MATH 201', n:'Linear Algebra'}],
      '300': [{c:'CSCI 301', n:'Algorithms'}, {c:'CSCI 303', n:'Operating Systems'}, {c:'CSCI 305', n:'Database Systems'}],
      '400': [] // Already has some
    },
    'it': {
      '100': [{c:'ITEC 101', n:'IT Fundamentals'}, {c:'ITEC 103', n:'Hardware Systems'}, {c:'MATH 105', n:'Applied Math'}],
      '200': [{c:'ITEC 201', n:'Networking I'}, {c:'ITEC 203', n:'System Admin'}, {c:'ITEC 205', n:'Web Development I'}],
      '300': [], // Seeded
      '400': []  // Seeded
    },
    'mis': {
      '100': [{c:'MIS 101', n:'Business Info Systems'}, {c:'ECON 101', n:'Microeconomics'}, {c:'MIS 103', n:'Management Fundamentals'}],
      '200': [{c:'MIS 201', n:'E-Commerce'}, {c:'MIS 203', n:'Accounting Info Systems'}, {c:'MIS 205', n:'Business Analytics'}],
      '300': [{c:'MIS 301', n:'Enterprise Systems'}, {c:'MIS 303', n:'Project Management'}, {c:'MIS 305', n:'Strategic MIS'}],
      '400': [{c:'MIS 401', n:'Digital Transformation'}, {c:'MIS 403', n:'Supply Chain Systems'}, {c:'MIS 405', n:'MIS Seminar'}]
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['8:30 AM', '12:30 PM', '5:00 PM'];
  const locations = ['F118', 'ECC 1', 'F117', 'SOT Lab', 'Admin 2'];

  let courseCount = 0;
  let sessionCount = 0;

  const jobs = [];
  for (const dept of departments) {
    for (const lvl of levels) {
      const templates = courseTemplates[dept][lvl] || [];
      for (const t of templates) {
        jobs.push({ dept, lvl, t });
      }
    }
  }

  await Promise.all(jobs.map(async ({ dept, lvl, t }) => {
    // Insert Course
    const { error: ce } = await supabase.from('courses').insert([{
      department: dept,
      level: lvl,
      code: t.c,
      name: t.n
    }]);
    if (!ce) courseCount++;

    // Insert 2 sessions per course
    const s1 = { course_code: t.c, day: days[Math.floor(Math.random() * 5)], time_slot: times[0], location: locations[Math.floor(Math.random() * 5)] };
    const s2 = { course_code: t.c, day: days[Math.floor(Math.random() * 5)], time_slot: times[1], location: locations[Math.floor(Math.random() * 5)] };

    await supabase.from('course_sessions').insert([s1, s2]);
    sessionCount += 2;
  }));

  console.log(`Master Seed Complete! Added ${courseCount} new courses and ${sessionCount} new sessions.`);
}

fullSeed();
