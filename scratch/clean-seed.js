const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanSeed() {
  console.log('Cleaning existing courses and sessions...');
  
  // 1. Delete all course sessions
  const { error: delSessionsErr } = await supabase.from('course_sessions').delete().neq('id', 0);
  if (delSessionsErr) console.error('Error deleting sessions:', delSessionsErr);

  // 2. Delete all courses
  const { error: delCoursesErr } = await supabase.from('courses').delete().neq('code', 'XYZ');
  if (delCoursesErr) console.error('Error deleting courses:', delCoursesErr);

  console.log('Repopulating clean data...');

  const allCourses = [
    // --- CS LEVEL 100 ---
    { d: 'cs', l: '100', c: 'CSCI 101', n: 'Intro to Computing', times: [{d: 'Monday', t: '8:30 AM'}, {d: 'Thursday', t: '12:30 PM'}] },
    { d: 'cs', l: '100', c: 'CSCI 103', n: 'Intro to Programming', times: [{d: 'Tuesday', t: '8:30 AM'}, {d: 'Friday', t: '12:30 PM'}] },
    { d: 'cs', l: '100', c: 'MATH 101', n: 'Calculus I', times: [{d: 'Wednesday', t: '8:30 AM'}] },
    { d: 'cs', l: '100', c: 'CSCI 105', n: 'Digital Logic & Design', times: [{d: 'Monday', t: '12:30 PM'}] },
    { d: 'cs', l: '100', c: 'GNS 101', n: 'Academic Writing I', times: [{d: 'Tuesday', t: '12:30 PM'}] },
    { d: 'cs', l: '100', c: 'GNS 103', n: 'French I', times: [{d: 'Saturday', t: '8:30 AM'}] },

    // --- CS LEVEL 200 ---
    { d: 'cs', l: '200', c: 'CSCI 201', n: 'Data Structures', times: [{d: 'Monday', t: '8:30 AM'}, {d: 'Wednesday', t: '12:30 PM'}] },
    { d: 'cs', l: '200', c: 'CSCI 203', n: 'Object Oriented Programming', times: [{d: 'Tuesday', t: '8:30 AM'}, {d: 'Thursday', t: '12:30 PM'}] },
    { d: 'cs', l: '200', c: 'MATH 201', n: 'Discrete Mathematics', times: [{d: 'Friday', t: '8:30 AM'}] },
    { d: 'cs', l: '200', c: 'CSCI 205', n: 'Computer Architecture', times: [{d: 'Monday', t: '12:30 PM'}] },
    { d: 'cs', l: '200', c: 'CSCI 207', n: 'Database Systems I', times: [{d: 'Wednesday', t: '8:30 AM'}] },
    { d: 'cs', l: '200', c: 'MATH 203', n: 'Probability & Statistics', times: [{d: 'Saturday', t: '12:30 PM'}] },

    // --- CS LEVEL 300 ---
    { d: 'cs', l: '300', c: 'CSCI 301', n: 'Algorithms', times: [{d: 'Monday', t: '5:00 PM'}, {d: 'Wednesday', t: '5:00 PM'}] },
    { d: 'cs', l: '300', c: 'CSCI 303', n: 'Operating Systems', times: [{d: 'Tuesday', t: '5:00 PM'}, {d: 'Thursday', t: '5:00 PM'}] },
    { d: 'cs', l: '300', c: 'CSCI 305', n: 'Database Systems II', times: [{d: 'Friday', t: '5:00 PM'}, {d: 'Saturday', t: '8:30 AM'}] },

    // --- CS LEVEL 400 ---
    { d: 'cs', l: '400', c: 'GSOT 403', n: 'Ethical & Legal Issues in Computing', times: [{d: 'Monday', t: '5:00 PM'}] },
    { d: 'cs', l: '400', c: 'MIS 401', n: 'Management Info. Systems', times: [{d: 'Tuesday', t: '5:00 PM'}] },
    { d: 'cs', l: '400', c: 'MIS 403', n: 'Electronic Business', times: [{d: 'Wednesday', t: '5:00 PM'}] },
    { d: 'cs', l: '400', c: 'GSOT 404', n: 'Computer & Information Security', times: [{d: 'Thursday', t: '5:00 PM'}] },
    { d: 'cs', l: '400', c: 'GSOT 401', n: 'Project I', times: [{d: 'Saturday', t: '8:30 AM'}] },
    { d: 'cs', l: '400', c: 'GSOT 402', n: 'Project II', times: [{d: 'Saturday', t: '12:30 PM'}] },

    // --- IT LEVEL 100 ---
    { d: 'it', l: '100', c: 'ITEC 101', n: 'Intro to Information Technology', times: [{d: 'Monday', t: '8:30 AM'}] },
    { d: 'it', l: '100', c: 'ITEC 103', n: 'PC Hardware & Maintenance', times: [{d: 'Tuesday', t: '12:30 PM'}] },
    { d: 'it', l: '100', c: 'MATH 105', n: 'Applied Mathematics', times: [{d: 'Wednesday', t: '8:30 AM'}] },
    { d: 'it', l: '100', c: 'ITEC 105', n: 'Office Productivity Tools', times: [{d: 'Thursday', t: '12:30 PM'}] },
    { d: 'it', l: '100', c: 'ITEC 107', n: 'Web Fundamentals', times: [{d: 'Friday', t: '8:30 AM'}] },
    { d: 'it', l: '100', c: 'GNS 101', n: 'Academic Writing I', times: [{d: 'Saturday', t: '8:30 AM'}] },

    // --- IT LEVEL 200 ---
    { d: 'it', l: '200', c: 'ITEC 201', n: 'Data Communications', times: [{d: 'Monday', t: '12:30 PM'}] },
    { d: 'it', l: '200', c: 'ITEC 203', n: 'System Administration', times: [{d: 'Tuesday', t: '8:30 AM'}] },
    { d: 'it', l: '200', c: 'ITEC 205', n: 'Web Technologies I', times: [{d: 'Wednesday', t: '12:30 PM'}] },
    { d: 'it', l: '200', c: 'ITEC 207', n: 'Database Management', times: [{d: 'Thursday', t: '8:30 AM'}] },
    { d: 'it', l: '200', c: 'ITEC 209', n: 'Human Computer Interaction', times: [{d: 'Friday', t: '12:30 PM'}] },
    { d: 'it', l: '200', c: 'ITEC 211', n: 'Multimedia Systems', times: [{d: 'Saturday', t: '12:30 PM'}] },

    // --- MIS LEVEL 100 ---
    { d: 'mis', l: '100', c: 'MIS 101', n: 'Business Info Systems', times: [{d: 'Monday', t: '8:30 AM'}] },
    { d: 'mis', l: '100', c: 'ECON 101', n: 'Microeconomics', times: [{d: 'Tuesday', t: '12:30 PM'}] },
    { d: 'mis', l: '100', c: 'MIS 103', n: 'Management Fundamentals', times: [{d: 'Wednesday', t: '8:30 AM'}] },
    { d: 'mis', l: '100', c: 'MIS 105', n: 'Intro to Marketing', times: [{d: 'Thursday', t: '12:30 PM'}] },
    { d: 'mis', l: '100', c: 'GNS 101', n: 'Academic Writing I', times: [{d: 'Friday', t: '8:30 AM'}] },
    { d: 'mis', l: '100', c: 'MATH 107', n: 'Business Math', times: [{d: 'Saturday', t: '8:30 AM'}] },

    // --- MIS LEVEL 200 ---
    { d: 'mis', l: '200', c: 'MIS 201', n: 'E-Commerce', times: [{d: 'Monday', t: '12:30 PM'}] },
    { d: 'mis', l: '200', c: 'MIS 203', n: 'Accounting Info Systems', times: [{d: 'Tuesday', t: '8:30 AM'}] },
    { d: 'mis', l: '200', c: 'MIS 205', n: 'Business Analytics', times: [{d: 'Wednesday', t: '12:30 PM'}] },
    { d: 'mis', l: '200', c: 'MIS 207', n: 'Organizational Behavior', times: [{d: 'Thursday', t: '8:30 AM'}] },
    { d: 'mis', l: '200', c: 'MIS 209', n: 'Financial Management', times: [{d: 'Friday', t: '12:30 PM'}] },
    { d: 'mis', l: '200', c: 'MIS 211', n: 'Database Systems for Business', times: [{d: 'Saturday', t: '12:30 PM'}] }
  ];

  const locations = ['F118', 'ECC 1', 'F117', 'Admin 2', 'ECC 2', 'SOT Lab'];

  await Promise.all(allCourses.map(async (item) => {
    // Insert Course
    const { error: ce } = await supabase.from('courses').upsert([{
      department: item.d,
      level: item.l,
      code: item.c,
      name: item.n
    }], { onConflict: 'code' });

    if (ce) {
      console.log(`Error inserting ${item.c}: ${ce.message}`);
      return;
    }

    // Insert Sessions
    await Promise.all(item.times.map(async (sessionTime) => {
      const loc = locations[Math.floor(Math.random() * locations.length)];
      await supabase.from('course_sessions').insert([{
        course_code: item.c,
        day: sessionTime.d,
        time_slot: sessionTime.t,
        location: loc
      }]);
    }));
  }));

  console.log('Clean Seed Complete!');
}

cleanSeed();
