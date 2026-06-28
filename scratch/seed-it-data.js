const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function seedITData() {
  console.log('Seeding IT 300 and 400 data...');

  // 1. Level 300 IT Courses
  const it300Courses = [
    { department: 'it', level: '300', code: 'GSOT 301', name: 'Software Engineering' },
    { department: 'it', level: '300', code: 'GSOT 303', name: 'Database Management Systems' },
    { department: 'it', level: '300', code: 'GSOT 305', name: 'Data Communications & Networking' },
    { department: 'it', level: '300', code: 'GSOT 307', name: 'Human Computer Interaction' },
    { department: 'it', level: '300', code: 'GSOT 309', name: 'Web Technologies' },
  ];

  await Promise.all(it300Courses.map(async (course) => {
    const { error } = await supabase.from('courses').insert([course]);
    if (error) console.log(`Skipping existing course: ${course.code}`);
  }));

  // 2. Level 400 IT Sessions
  const itSessions = [
    { course_code: 'GSOT 401', day: 'Monday', time_slot: '5:00 PM', location: 'ECC 1' },
    { course_code: 'ICTE 402', day: 'Wednesday', time_slot: '5:00 PM', location: 'F117' },
    { course_code: 'GSOT 404', day: 'Thursday', time_slot: '5:00 PM', location: 'F118' },
    { course_code: 'GSOT 406', day: 'Friday', time_slot: '5:00 PM', location: 'SOT Lab' },
    
    { course_code: 'GSOT 301', day: 'Monday', time_slot: '5:00 PM', location: 'F118' },
    { course_code: 'GSOT 303', day: 'Tuesday', time_slot: '5:00 PM', location: 'ECC 2' },
    { course_code: 'GSOT 305', day: 'Wednesday', time_slot: '5:00 PM', location: 'F117' },
    { course_code: 'GSOT 307', day: 'Thursday', time_slot: '5:00 PM', location: 'F118' },
    { course_code: 'GSOT 309', day: 'Friday', time_slot: '5:00 PM', location: 'SOT Lab' },
    { course_code: 'GSOT 301', day: 'Saturday', time_slot: '8:30 AM', location: 'F118' },
    { course_code: 'GSOT 303', day: 'Saturday', time_slot: '12:30 PM', location: 'ECC 2' },
  ];

  await Promise.all(itSessions.map(async (session) => {
    const { error } = await supabase.from('course_sessions').insert([session]);
    if (error) console.log(`Skipping existing session: ${session.course_code} on ${session.day}`);
  }));

  console.log('IT Data seeding completed!');
}

seedITData();
