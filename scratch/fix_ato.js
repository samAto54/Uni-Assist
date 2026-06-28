const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAto() {
  const { data: messages, error } = await supabase.from('chat_messages').select('user_id').limit(1);
  if (messages && messages.length > 0) {
    console.log('Found User ID from chat messages:', messages[0].user_id);
    
    // Create the student record for this user
    const { error: insErr } = await supabase.from('students').upsert([{
      id: messages[0].user_id,
      full_name: 'Ato',
      email: 'ato@example.com', // Placeholder
      department: 'cs',
      level: '400'
    }]);
    
    if (insErr) console.error('Error inserting student:', insErr);
    else console.log('Successfully created student record for Ato (CS 400)');
  } else {
    console.log('No chat messages found to identify user.');
  }
}

findAto();
