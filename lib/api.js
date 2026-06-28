/**
 * lib/api.js
 * Centralised Supabase query functions.
 * All screens import from here — no inline queries in components.
 * This makes queries testable, reusable, and easy to cache later.
 */

import { supabase } from './supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAYS_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function resolveStudentProfile(student, userMetadata) {
    if (student?.department && student?.level) return student;
    const m = userMetadata || {};
    return {
        department: student?.department || m.department || m.course || 'cs',
        level:      student?.level      || m.level      || '100',
    };
}

// ── Students ──────────────────────────────────────────────────────────────────

export async function fetchStudentProfile(userId) {
    const { data, error } = await supabase
        .from('students')
        .select('department, level, full_name, email, index_number')
        .eq('id', userId)
        .single();
    return { data, error };
}

// ── Courses ───────────────────────────────────────────────────────────────────

export async function fetchCoursesByDept(department, level) {
    const { data, error } = await supabase
        .from('courses')
        .select('id, code, name, description, department, level, class_size')
        .eq('department', department.trim())
        .eq('level', level.toString().trim())
        .order('code');
    return { data: data || [], error };
}

export async function fetchAllCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select('id, code, name, department, level')
        .order('department').order('level').order('code');
    return { data: data || [], error };
}

export async function fetchCoursesByCodes(codes) {
    if (!codes?.length) return { data: [], error: null };
    const { data, error } = await supabase
        .from('courses')
        .select('id, code, name, department, level')
        .in('code', codes)
        .order('code');
    return { data: data || [], error };
}

export async function incrementClassSize(courseCode, currentSize) {
    const { error } = await supabase
        .from('courses')
        .update({ class_size: currentSize + 1 })
        .eq('code', courseCode);
    return { error };
}

// ── Course Sessions ───────────────────────────────────────────────────────────

export async function fetchSessionsByCodes(courseCodes) {
    if (!courseCodes?.length) return { data: [], error: null };
    const { data, error } = await supabase
        .from('course_sessions')
        .select('course_code, day, time_slot, location')
        .in('course_code', courseCodes);
    return { data: data || [], error };
}

export async function fetchSessionsByCodesAndDay(courseCodes, day) {
    if (!courseCodes?.length) return { data: [], error: null };
    const { data, error } = await supabase
        .from('course_sessions')
        .select('course_code, day, time_slot, location')
        .in('course_code', courseCodes)
        .eq('day', day);
    return { data: data || [], error };
}

// ── Timetable (student) ───────────────────────────────────────────────────────

export async function fetchStudentTimetable(userId, userMetadata) {
    // 1. Get student profile
    const { data: student } = await fetchStudentProfile(userId);
    const profile = resolveStudentProfile(student, userMetadata);

    if (!profile.department || !profile.level) {
        return { data: [], error: null, profile };
    }

    // 2. Get courses
    const { data: courses, error: ce } = await fetchCoursesByDept(profile.department, profile.level);
    if (ce || !courses.length) return { data: [], error: ce, profile };

    const courseCodes = courses.map(c => c.code);
    const courseNames = courses.reduce((acc, c) => ({ ...acc, [c.code]: c.name }), {});

    // 3. Get sessions
    const { data: sessions, error: se } = await fetchSessionsByCodes(courseCodes);
    if (se) return { data: [], error: se, profile };

    // 4. Group by day, deduplicate
    const grouped = {};
    sessions.forEach(s => {
        if (!grouped[s.day]) grouped[s.day] = [];
        const courseStr = `${s.course_code}: ${courseNames[s.course_code]}`;
        const isDup = grouped[s.day].some(x =>
            x.time === s.time_slot && x.course === courseStr && x.location === s.location
        );
        if (!isDup) grouped[s.day].push({ time: s.time_slot, course: courseStr, location: s.location });
    });

    const timetable = Object.keys(grouped)
        .sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b))
        .map(day => ({ day, classes: grouped[day] }));

    return { data: timetable, error: null, profile };
}

// ── Announcements ─────────────────────────────────────────────────────────────

export async function fetchAnnouncements(limit = 50) {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    return { data: data || [], error };
}

// ── Emergency contacts ────────────────────────────────────────────────────────

export async function fetchEmergencyContacts() {
    const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .order('sort_order');
    return { data: data || [], error };
}

// ── Chat messages ─────────────────────────────────────────────────────────────

export async function fetchChatHistory(userId, limit = 100) {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('id, sender, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(limit);
    return { data: data || [], error };
}

export async function saveChatMessage(userId, sender, content) {
    const { error } = await supabase
        .from('chat_messages')
        .insert([{ user_id: userId, sender, content }]);
    return { error };
}

// ── Course outlines ───────────────────────────────────────────────────────────

export async function fetchCourseOutline(courseCode) {
    const { data, error } = await supabase
        .from('course_outlines')
        .select('*')
        .eq('course_code', courseCode)
        .maybeSingle();
    return { data, error };
}

export async function upsertCourseOutline({ courseCode, title, lecturer, lecturerId, outline }) {
    const { error } = await supabase
        .from('course_outlines')
        .upsert({
            course_code: courseCode,
            title,
            lecturer: lecturer || 'Unknown',
            lecturer_id: lecturerId,
            outline: outline.trim(),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'course_code' });
    return { error };
}

// ── Enrollments ───────────────────────────────────────────────────────────────

export async function checkEnrollment(studentId, courseCode) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_code', courseCode)
        .maybeSingle();
    return { data, error };
}

export async function enrollStudent(studentId, courseCode) {
    const { error } = await supabase
        .from('course_enrollments')
        .insert([{ student_id: studentId, course_code: courseCode }]);
    return { error };
}

// ── Inquiries ─────────────────────────────────────────────────────────────────

export async function fetchOrCreateInquiryThread(studentId, courseCode) {
    let { data: inq, error: fe } = await supabase
        .from('inquiries')
        .select('id')
        .eq('student_id', studentId)
        .eq('course', courseCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (fe) return { data: null, error: fe };

    if (!inq) {
        const { data: newInq, error: ne } = await supabase
            .from('inquiries')
            .insert([{ student_id: studentId, course: courseCode, question: '(thread)', status: 'GENERAL' }])
            .select('id')
            .single();
        if (ne) return { data: null, error: ne };
        inq = newInq;
    }
    return { data: inq, error: null };
}

export async function fetchInquiryMessages(inquiryId) {
    const { data, error } = await supabase
        .from('inquiry_messages')
        .select('id, sender_id, sender_role, content, created_at')
        .eq('inquiry_id', inquiryId)
        .order('created_at', { ascending: true });
    return { data: (data || []).filter(m => m.content !== '(thread)'), error };
}

export async function sendInquiryMessage(inquiryId, senderId, senderRole, content) {
    const { data, error } = await supabase
        .from('inquiry_messages')
        .insert([{ inquiry_id: inquiryId, sender_id: senderId, sender_role: senderRole, content }])
        .select()
        .single();
    return { data, error };
}

// ── Push tokens ───────────────────────────────────────────────────────────────

export async function upsertPushToken(userId, token, platform) {
    const { error } = await supabase
        .from('push_tokens')
        .upsert({ user_id: userId, token, platform, updated_at: new Date().toISOString() },
                 { onConflict: 'user_id,platform' });
    return { error };
}

// ── Lecturer stats ────────────────────────────────────────────────────────────

export async function fetchLecturerStats(courseCodes) {
    if (!courseCodes?.length) return { courseCount: 0, sessionCount: 0 };
    const [{ count: cc }, { count: sc }] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }).in('code', courseCodes),
        supabase.from('course_sessions').select('id', { count: 'exact', head: true }).in('course_code', courseCodes),
    ]);
    return { courseCount: cc || 0, sessionCount: sc || 0 };
}

export async function fetchPendingInquiriesCount() {
    const { count, error } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'RESOLVED');
    return { count: count || 0, error };
}

// ── Student roster ────────────────────────────────────────────────────────────

export async function fetchCourseRoster(department, level) {
    const { data, error } = await supabase
        .from('students')
        .select('full_name, id')
        .eq('department', department)
        .eq('level', level)
        .order('full_name');
    const roster = (data || []).map(s => ({
        ...s,
        index_number: (s.id || '').slice(0, 7).toUpperCase(),
    }));
    return { data: roster, error };
}
