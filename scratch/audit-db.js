const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function auditDatabase() {
  const depts = ['cs', 'it', 'mis'];
  const levels = ['100', '200', '300', '400'];
  
  console.log('------------------------------------------------------------');
  console.log('   UNI-ASSIST DATABASE AUDIT REPORT');
  console.log('------------------------------------------------------------');
  
  const deptReports = await Promise.all(depts.map(async (d) => {
    const levelReports = await Promise.all(levels.map(async (l) => {
      const { data: courses } = await supabase.from('courses').select('*').eq('department', d).eq('level', l);
      let sessionCount = 0;
      if (courses && courses.length > 0) {
        const codes = courses.map(c => c.code);
        const { data: sessions } = await supabase.from('course_sessions').select('*').in('course_code', codes);
        sessionCount = sessions ? sessions.length : 0;
      }
      const status = (courses && courses.length > 0 && sessionCount > 0) ? '✅ OK' : '❌ MISSING DATA';
      return `  Level ${l}: ${courses?.length || 0} Courses | ${sessionCount} Sessions | ${status}`;
    }));
    return { dept: d, lines: levelReports };
  }));

  deptReports.forEach((report) => {
    console.log(`\nDEPARTMENT: ${report.dept.toUpperCase()}`);
    report.lines.forEach((line) => console.log(line));
  });
  console.log('\n------------------------------------------------------------');
}

auditDatabase();
