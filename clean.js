const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching all sessions...');
  const { data: allSessions, error: selError } = await supabase.from('course_sessions').select('id');
  if (selError) { console.error(selError); return; }
  
  const ids = allSessions.map(s => s.id);
  console.log('Deleting ' + ids.length + ' sessions...');
  
  const deleteChunks = [];
  for (let i = 0; i < ids.length; i += 50) {
    deleteChunks.push(ids.slice(i, i + 50));
  }
  await Promise.all(deleteChunks.map(async (chunk) => {
    const { error: delError } = await supabase.from('course_sessions').delete().in('id', chunk);
    if (delError) console.error(delError);
  }));
  console.log('Wiped successfully.');

  const { data: courses } = await supabase.from('courses').select('code').order('code');
  const uniqueCodes = [...new Set(courses.map(c => c.code))];
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['8:30 AM', '12:30 PM', '5:00 PM'];
  const locations = ['F118', 'ECC 1', 'F117', 'SOT Lab', 'Admin 2'];
  
  console.log('Generating 1 deterministic session per unique course...');
  const sessions = uniqueCodes.map((code, i) => ({
    course_code: code,
    day: days[i % 5],
    time_slot: times[i % 3],
    location: locations[i % 5]
  }));

  const insertChunks = [];
  for (let i = 0; i < sessions.length; i += 10) {
    insertChunks.push(sessions.slice(i, i + 10));
  }
  await Promise.all(insertChunks.map(async (chunk) => {
    const { error: insError } = await supabase.from('course_sessions').insert(chunk);
    if (insError) console.error('Insert error:', insError);
  }));
  console.log('Successfully inserted ' + sessions.length + ' clean sessions.');
}
run().catch(console.error);
