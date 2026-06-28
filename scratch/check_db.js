const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- Checking Supabase Data ---');

  const { data: students, error: sErr } = await supabase.from('students').select('*');
  console.log('\nStudents:', students || sErr);

  const { data: courses, error: cErr } = await supabase.from('courses').select('*');
  console.log('\nCourses:', courses || cErr);

  const { data: sessions, error: sesErr } = await supabase.from('course_sessions').select('*');
  console.log('\nCourse Sessions:', sessions || sesErr);
}

checkData();
