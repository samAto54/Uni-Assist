const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function smartSeed() {
  console.log('Cleaning all course sessions...');
  const { error: delErr } = await supabase.from('course_sessions').delete().not('course_code', 'is', null);
  if (delErr) {
    console.error('Error deleting sessions:', delErr);
    return;
  }

  console.log('Fetching all existing courses...');
  const { data: courses, error: getErr } = await supabase.from('courses').select('*');
  if (getErr) {
    console.error('Error fetching courses:', getErr);
    return;
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const times = ['8:30 AM', '12:30 PM', '5:00 PM'];
  const locations = ['F118', 'ECC 1', 'F117', 'Admin 2', 'ECC 2', 'SOT Lab'];

  // Keep track of how many classes we assigned to a level per day so we spread them out
  const levelScheduleCount = {};

  console.log('Generating fresh, non-overlapping sessions...');
  const rows = [];
  for (const c of courses) {
    const levelKey = `${c.department}-${c.level}`;
    if (!levelScheduleCount[levelKey]) {
      levelScheduleCount[levelKey] = 0;
    }

    // Every course gets exactly two sessions, spread by level/day.
    const numSessions = 2;
    for (let i = 0; i < numSessions; i++) {
      const dayIdx = (levelScheduleCount[levelKey] + i) % days.length;
      const timeIdx = (levelScheduleCount[levelKey] + i) % times.length;
      const loc = locations[Math.floor(Math.random() * locations.length)];
      rows.push({
        course_code: c.code,
        day: days[dayIdx],
        time_slot: times[timeIdx],
        location: loc
      });
    }
    levelScheduleCount[levelKey] += numSessions;
  }

  await Promise.all(rows.map(async (row) => {
    await supabase.from('course_sessions').insert([row]);
  }));

  console.log('Smart Seed Complete!');
}

smartSeed();
