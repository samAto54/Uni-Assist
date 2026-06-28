const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Try to insert a test row to see if RLS is blocking saves
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const testUserId = '00000000-0000-0000-0000-000000000001';
  
  console.log('Attempting to INSERT a chat message as anon key...');
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ user_id: testUserId, sender: 'user', content: 'test message' }])
    .select();

  if (error) {
    console.log('INSERT FAILED:', error.message);
    console.log('Code:', error.code);
    console.log('\n=> RLS is blocking inserts from the anon key. This is why no messages are saved!');
  } else {
    console.log('INSERT succeeded:', data);
    // Clean up
    await supabase.from('chat_messages').delete().eq('user_id', testUserId);
    console.log('Test row cleaned up.');
  }
}
run().catch(console.error);
