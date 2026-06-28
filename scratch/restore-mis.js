const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function expandedSeed() {
  console.log('Restoring MIS 100 & 200...');

  const data = [
    // --- MIS LEVEL 100 ---
    { d: 'mis', l: '100', c: 'MIS 101', n: 'Business Info Systems' },
    { d: 'mis', l: '100', c: 'ECON 101', n: 'Microeconomics' },
    { d: 'mis', l: '100', c: 'MIS 103', n: 'Management Fundamentals' },
    { d: 'mis', l: '100', c: 'MIS 105', n: 'Intro to Marketing' },
    { d: 'mis', l: '100', c: 'GNS 101', n: 'Academic Writing I' },
    { d: 'mis', l: '100', c: 'MATH 107', n: 'Business Math' },

    // --- MIS LEVEL 200 ---
    { d: 'mis', l: '200', c: 'MIS 201', n: 'E-Commerce' },
    { d: 'mis', l: '200', c: 'MIS 203', n: 'Accounting Info Systems' },
    { d: 'mis', l: '200', c: 'MIS 205', n: 'Business Analytics' },
    { d: 'mis', l: '200', c: 'MIS 207', n: 'Organizational Behavior' },
    { d: 'mis', l: '200', c: 'MIS 209', n: 'Financial Management' },
    { d: 'mis', l: '200', c: 'MIS 211', n: 'Database Systems for Business' },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const locations = ['F118', 'ECC 1', 'F117', 'Admin 2', 'ECC 2'];

  await Promise.all(data.map(async (item) => {
    await supabase.from('courses').insert([{
      department: item.d,
      level: item.l,
      code: item.c,
      name: item.n
    }]);

    const sessions = [
      { course_code: item.c, day: days[Math.floor(Math.random() * 5)], time_slot: '5:00 PM', location: locations[Math.floor(Math.random() * 5)] },
      { course_code: item.c, day: 'Saturday', time_slot: '8:30 AM', location: locations[Math.floor(Math.random() * 5)] }
    ];
    await supabase.from('course_sessions').insert(sessions);
  }));

  console.log('MIS Data Restored!');
}

expandedSeed();
