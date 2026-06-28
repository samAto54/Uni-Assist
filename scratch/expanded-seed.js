const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function expandedSeed() {
  console.log('Expanding Course Data for CS/IT 100 & 200...');

  const data = [
    // --- CS LEVEL 100 ---
    { d: 'cs', l: '100', c: 'CSCI 101', n: 'Intro to Computing' },
    { d: 'cs', l: '100', c: 'CSCI 103', n: 'Intro to Programming (Python)' },
    { d: 'cs', l: '100', c: 'MATH 101', n: 'Calculus I' },
    { d: 'cs', l: '100', c: 'CSCI 105', n: 'Digital Logic & Design' },
    { d: 'cs', l: '100', c: 'GNS 101', n: 'Academic Writing I' },
    { d: 'cs', l: '100', c: 'GNS 103', n: 'French I' },

    // --- CS LEVEL 200 ---
    { d: 'cs', l: '200', c: 'CSCI 201', n: 'Data Structures' },
    { d: 'cs', l: '200', c: 'CSCI 203', n: 'Object Oriented Programming' },
    { d: 'cs', l: '200', c: 'MATH 201', n: 'Discrete Mathematics' },
    { d: 'cs', l: '200', c: 'CSCI 205', n: 'Computer Architecture' },
    { d: 'cs', l: '200', c: 'CSCI 207', n: 'Database Systems I' },
    { d: 'cs', l: '200', c: 'MATH 203', n: 'Probability & Statistics' },

    // --- IT LEVEL 100 ---
    { d: 'it', l: '100', c: 'ITEC 101', n: 'Intro to Information Technology' },
    { d: 'it', l: '100', c: 'ITEC 103', n: 'PC Hardware & Maintenance' },
    { d: 'it', l: '100', c: 'MATH 105', n: 'Applied Mathematics' },
    { d: 'it', l: '100', c: 'ITEC 105', n: 'Office Productivity Tools' },
    { d: 'it', l: '100', c: 'ITEC 107', n: 'Web Fundamentals' },
    { d: 'it', l: '100', c: 'GNS 101', n: 'Academic Writing I' },

    // --- IT LEVEL 200 ---
    { d: 'it', l: '200', c: 'ITEC 201', n: 'Data Communications & Networking I' },
    { d: 'it', l: '200', c: 'ITEC 203', n: 'System Administration' },
    { d: 'it', l: '200', c: 'ITEC 205', n: 'Web Technologies I' },
    { d: 'it', l: '200', c: 'ITEC 207', n: 'Database Management' },
    { d: 'it', l: '200', c: 'ITEC 209', n: 'Human Computer Interaction' },
    { d: 'it', l: '200', c: 'ITEC 211', n: 'Multimedia Systems' },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const locations = ['F118', 'ECC 1', 'F117', 'SOT Lab', 'Admin 2', 'ECC 2'];

  await Promise.all(data.map(async (item) => {
    const { error: ce } = await supabase.from('courses').insert([{
      department: item.d,
      level: item.l,
      code: item.c,
      name: item.n
    }]);

    if (ce) {
      console.log(`Skipping or error for ${item.c}: ${ce.message}`);
      return;
    }

    const sessions = [
      { course_code: item.c, day: days[Math.floor(Math.random() * 5)], time_slot: '5:00 PM', location: locations[Math.floor(Math.random() * 6)] },
      { course_code: item.c, day: 'Saturday', time_slot: Math.random() > 0.5 ? '8:30 AM' : '12:30 PM', location: locations[Math.floor(Math.random() * 6)] }
    ];

    await supabase.from('course_sessions').insert(sessions);
  }));

  console.log('Expanded Data Seed Complete!');
}

expandedSeed();
