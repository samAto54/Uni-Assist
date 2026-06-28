import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, ScrollView,
    Pressable, useWindowDimensions,
    ActivityIndicator
} from 'react-native';
import {
    Clock, BookOpen, MessageSquare, Navigation as NavIcon,
    Megaphone, User, Sparkles, ChevronRight, Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// ── helpers ──────────────────────────────────────────────────────────────────
function getDayName() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function parseTimeRange(slot) {
    if (!slot) return { start: new Date(), end: new Date() };
    const parts = slot.split(/\s*[-\u2013]\s*/).map(s => s.trim()).filter(Boolean);
    const toDate = (str) => {
        if (!str) return new Date();
        const trimmed = str.trim();
        const spaceIdx = trimmed.lastIndexOf(' ');
        if (spaceIdx === -1) return new Date();
        const period = trimmed.substring(spaceIdx + 1).toUpperCase();
        const timePart = trimmed.substring(0, spaceIdx);
        const colonIdx = timePart.indexOf(':');
        let h, m;
        if (colonIdx === -1) { h = parseInt(timePart, 10); m = 0; }
        else { h = parseInt(timePart.substring(0, colonIdx), 10); m = parseInt(timePart.substring(colonIdx + 1), 10) || 0; }
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    };
    const start = toDate(parts[0]);
    const end = parts[1] ? toDate(parts[1]) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
}

const DEPT_LABELS = {
    cs: 'Computer Science',
    it: 'Information Technology',
    mis: 'Management Information Systems',
};
const deptLabel = (d) => DEPT_LABELS[d] || (d ? d.toUpperCase() : '—');

// ── main component ────────────────────────────────────────────────────────────
export default function LecturerOverview() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const router = useRouter();
    const { user } = useAuth();

    const name = user?.user_metadata?.full_name || 'Lecturer';
    const dept = user?.user_metadata?.department || null;
    const assignedCodes = Array.isArray(user?.user_metadata?.course_codes)
        ? user.user_metadata.course_codes
        : null;

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });

    const [loading, setLoading] = useState(true);
    const [courseCount, setCourseCount] = useState('—');
    const [sessionCount, setSessionCount] = useState('—');
    const [nextClass, setNextClass] = useState(null);
    const [todaySessions, setTodaySessions] = useState([]);
    const [courseList, setCourseList] = useState([]);
    const [pendingInquiries, setPendingInquiries] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchStats(), fetchSchedule(), fetchPendingInquiries()]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [assignedCodes, dept]);

    async function fetchPendingInquiries() {
        try {
            const { count } = await supabase
                .from('inquiries')
                .select('id', { count: 'exact', head: true })
                .neq('status', 'RESOLVED');
            setPendingInquiries(count || 0);
        } catch (e) { /* inquiry_messages table may not exist yet */ }
    }

    async function fetchStats() {
        try {
            let codes = assignedCodes;
            if (!codes?.length && dept) {
                const { data: deptCourses } = await supabase
                    .from('courses').select('code').eq('department', dept);
                codes = (deptCourses || []).map(c => c.code);
            }

            if (codes && codes.length > 0) {
                const { count: cc, error } = await supabase
                    .from('courses').select('id', { count: 'exact', head: true }).in('code', codes);
                if (error) { console.error('[Overview] fetchStats:', error.message); return; }
                setCourseCount(String(cc || 0));

                const { count: sc, error: se } = await supabase
                    .from('course_sessions').select('id', { count: 'exact', head: true }).in('course_code', codes);
                if (se) { console.error('[Overview] sessions:', se.message); return; }
                setSessionCount(String(sc || 0));
            } else {
                setCourseCount('0');
                setSessionCount('0');
            }
        } catch (e) { console.error('[Overview] fetchStats:', e.message); }
    }

    async function fetchSchedule() {
        try {
            const dayName = getDayName();
            let courses = [];

            if (assignedCodes && assignedCodes.length > 0) {
                const { data, error: ce } = await supabase
                    .from('courses').select('code, name, level').in('code', assignedCodes);
                if (ce) { console.error('[Overview] courses:', ce.message); return; }
                courses = data || [];
            } else if (dept) {
                const { data, error: ce } = await supabase
                    .from('courses').select('code, name, level').eq('department', dept);
                if (ce) { console.error('[Overview] courses:', ce.message); return; }
                courses = data || [];
            }

            if (courses.length === 0) return;
            setCourseList(courses);

            const codes = courses.map(c => c.code);
                const { data: sessions, error: se } = await supabase
                .from('course_sessions')
                .select('id, course_code, day, time_slot, location')
                .in('course_code', codes)
                .eq('day', dayName);
            if (se) { console.error('[Overview] sessions:', se.message); return; }

            const now = new Date();
            const enriched = (sessions || []).map(s => {
                const course = courses.find(c => c.code === s.course_code);
                const { start, end } = parseTimeRange(s.time_slot);
                return {
                    ...s,
                    courseName: course?.name || s.course_code,
                    start, end,
                    isLive: now >= start && now <= end,
                    isPast: now > end,
                };
            }).sort((a, b) => a.start - b.start);

            setTodaySessions(enriched);
            const upcoming = enriched.find(s => !s.isPast);
            if (upcoming) setNextClass(upcoming.time_slot);
        } catch (e) { console.error('[Overview] fetchSchedule:', e.message); }
    }

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.welcomeSection}>
                <Text style={[styles.greetingText, isMobile && styles.mobileGreetingText]}>
                    Welcome back, {name}
                </Text>
                <Text style={styles.dateText}>{today}</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#102a43" style={{ marginVertical: 40 }} />
            ) : (
                <>
                    {/* Stat cards */}
                    <View style={[styles.statsGrid, isMobile && styles.mobileGrid]}>
                        <StatCard
                            title="COURSES"
                            value={courseCount}
                            subtext="I teach"
                            icon={<BookOpen size={20} color="#10b981" />}
                        />
                        <StatCard
                            title="SESSIONS"
                            value={sessionCount}
                            subtext="Scheduled"
                            icon={<Clock size={20} color="#3b82f6" />}
                        />
                        <StatCard
                            title="NEXT CLASS"
                            value={nextClass || '\u2014'}
                            subtext={nextClass ? 'Today' : 'No class today'}
                            icon={<Clock size={20} color="#8b5cf6" />}
                        />
                    </View>

                    {/* View full schedule button */}
                    <Pressable
                        onPress={() => router.push('/(lecturer)/classes')}
                        style={({ pressed }) => [styles.viewScheduleBtn, pressed && { opacity: 0.9 }]}
                    >
                        <Clock size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.viewScheduleBtnText}>View Full Teaching Schedule</Text>
                    </Pressable>

                    {/* ── Quick access grid ─────────────────────────────────── */}
                    <SectionHeader title="Quick Access" style={{ marginBottom: 16 }} />
                    <View style={[styles.quickGrid, isMobile && styles.quickGridMobile]}>
                        <QuickCard
                            icon={<BookOpen size={22} color="#3b82f6" />}
                            label="My Courses"
                            sublabel="Manage & upload outlines"
                            color="#eff6ff"
                            onPress={() => router.push('/(lecturer)/classes')}
                        />
                        <QuickCard
                            icon={<MessageSquare size={22} color="#ef4444" />}
                            label="Inquiries"
                            sublabel={pendingInquiries > 0 ? `${pendingInquiries} pending` : 'All caught up'}
                            color="#fef2f2"
                            badge={pendingInquiries > 0 ? pendingInquiries : null}
                            onPress={() => router.push('/(lecturer)/inquiries')}
                        />
                        <QuickCard
                            icon={<Sparkles size={22} color="#8b5cf6" />}
                            label="AI Assistant"
                            sublabel="Ask anything about GIMPA"
                            color="#f5f3ff"
                            onPress={() => router.push('/(lecturer)/chat')}
                        />
                        <QuickCard
                            icon={<NavIcon size={22} color="#10b981" />}
                            label="Navigation"
                            sublabel="Campus map & directions"
                            color="#f0fdf4"
                            onPress={() => router.push('/(lecturer)/navigation')}
                        />
                        <QuickCard
                            icon={<Megaphone size={22} color="#f59e0b" />}
                            label="Announcements"
                            sublabel="Campus news & alerts"
                            color="#fffbeb"
                            onPress={() => router.push('/(dashboard)/announcements')}
                        />
                        <QuickCard
                            icon={<User size={22} color="#64748b" />}
                            label="Profile"
                            sublabel="Edit your details"
                            color="#f8fafc"
                            onPress={() => router.push('/(lecturer)/profile')}
                        />
                    </View>

                    {/* Today's schedule */}
                    <SectionHeader title="Today's Teaching Schedule" />
                    {todaySessions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No classes scheduled for today.</Text>
                        </View>
                    ) : (
                        todaySessions.map((s) => (
                            <ScheduleItem
                                key={s.id ?? `${s.course_code}-${s.time_slot}`}
                                time={s.time_slot}
                                course={`${s.course_code}: ${s.courseName}`}
                                location={s.location}
                                active={s.isLive}
                                past={s.isPast}
                            />
                        ))
                    )}

                    {/* Courses I teach */}
                    <SectionHeader
                        title="Courses I Teach"
                        action="Manage"
                        onAction={() => router.push('/(lecturer)/classes')}
                        style={{ marginTop: 40 }}
                    />
                    {courseList.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                No courses assigned yet. Tap Courses to add yours.
                            </Text>
                        </View>
                    ) : (
                        courseList.map(c => (
                            <View key={c.code} style={styles.courseRow}>
                                <View style={styles.courseIconBox}>
                                    <BookOpen size={18} color="#102a43" />
                                </View>
                                <View style={styles.courseRowInfo}>
                                    <Text style={styles.courseRowCode}>{c.code}</Text>
                                    <Text style={styles.courseRowName}>{c.name}</Text>
                                </View>
                                <View style={styles.levelBadge}>
                                    <Text style={styles.levelBadgeText}>Level {c.level}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </>
            )}
        </ScrollView>
    );
}

// ── sub-components ────────────────────────────────────────────────────────────
function QuickCard({ icon, label, sublabel, color, badge, onPress }) {
    return (
        <Pressable style={({ pressed }) => [{ ...styles.quickCard, backgroundColor: color }, pressed && { opacity: 0.9 }]} onPress={onPress}>
            <View style={styles.quickCardIcon}>{icon}</View>
            {badge != null && (
                <View style={styles.quickBadge}>
                    <Text style={styles.quickBadgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
            )}
            <Text style={styles.quickCardLabel}>{label}</Text>
            <Text style={styles.quickCardSub} numberOfLines={1}>{sublabel}</Text>
            <ChevronRight size={14} color="#9fb3c8" style={{ marginTop: 4 }} />
        </Pressable>
    );
}

function StatCard({ title, value, subtext, icon }) {
    return (
        <View style={styles.statCard}>
            <View style={styles.statHeader}>
                <Text style={styles.statTitle}>{title}</Text>
                {icon}
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statSubtext}>{subtext}</Text>
        </View>
    );
}

function SectionHeader({ title, action, onAction, style }) {
    return (
        <View style={[styles.sectionHeader, style]}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {action && (
                <Pressable onPress={onAction} style={({ pressed }) => pressed && { opacity: 0.85 }}>
                    <Text style={styles.actionText}>{action}</Text>
                </Pressable>
            )}
        </View>
    );
}

function ScheduleItem({ time, course, location, active, past }) {
    return (
        <View style={[styles.scheduleCard, active && styles.activeSchedule, past && { opacity: 0.5 }]}>
            <View style={styles.scheduleTime}>
                <Text style={[styles.timeText, active && styles.activeText]}>{time}</Text>
            </View>
            <View style={styles.scheduleInfo}>
                <Text style={[styles.courseName, active && styles.activeText]}>{course}</Text>
                <Text style={[styles.locationText, active && styles.activeText]}>{location}</Text>
            </View>
            {active && <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>}
        </View>
    );
}

const styles = StyleSheet.create({
    scrollArea: { flex: 1 },
    scrollContent: { padding: 40 },
    mobileScrollContent: { padding: 20 },
    welcomeSection: { marginBottom: 32 },
    greetingText: { fontSize: 32, fontWeight: '900', color: '#102a43' },
    mobileGreetingText: { fontSize: 24 },
    dateText: { fontSize: 16, color: '#627d98', marginTop: 8 },
    statsGrid: { flexDirection: 'row', gap: 20, marginBottom: 40, flexWrap: 'wrap' },
    mobileGrid: { flexDirection: 'column' },
    statCard: { flex: 1, minWidth: 140, backgroundColor: 'white', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#e1e7ec' },
    statHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    statTitle: { fontSize: 11, fontWeight: 'bold', color: '#9fb3c8', letterSpacing: 1 },
    statValue: { fontSize: 28, fontWeight: '900', color: '#102a43', marginBottom: 4 },
    statSubtext: { fontSize: 12, color: '#627d98' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#102a43' },
    actionText: { fontSize: 14, fontWeight: '600', color: '#486581' },
    scheduleCard: { flexDirection: 'row', backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e1e7ec' },
    activeSchedule: { backgroundColor: '#102a43', borderColor: '#102a43' },
    scheduleTime: { width: 90, borderRightWidth: 1, borderRightColor: '#f0f4f8', marginRight: 20 },
    timeText: { fontSize: 15, fontWeight: 'bold', color: '#102a43' },
    activeText: { color: 'white' },
    scheduleInfo: { flex: 1 },
    courseName: { fontSize: 16, fontWeight: 'bold', color: '#102a43', marginBottom: 4 },
    locationText: { fontSize: 13, color: '#627d98' },
    liveBadge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    liveText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    emptyState: { backgroundColor: 'white', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e1e7ec', alignItems: 'center', marginBottom: 12 },
    emptyText: { fontSize: 14, color: '#9fb3c8', textAlign: 'center' },
    courseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e1e7ec' },
    courseIconBox: { width: 40, height: 40, backgroundColor: '#f0f4f8', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    courseRowInfo: { flex: 1 },
    courseRowCode: { fontSize: 12, fontWeight: 'bold', color: '#3b82f6', marginBottom: 2 },
    courseRowName: { fontSize: 15, fontWeight: '600', color: '#102a43' },
    levelBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    levelBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#0369a1' },
    viewScheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#102a43', height: 52, borderRadius: 14, marginBottom: 40 },
    viewScheduleBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
    quickGridMobile: { gap: 10 },
    quickCard: {
        width: '47%', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#102a43', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        position: 'relative',
    },
    quickCardIcon: { marginBottom: 10 },
    quickCardLabel: { fontSize: 15, fontWeight: '700', color: '#102a43', marginBottom: 2 },
    quickCardSub: { fontSize: 12, color: '#627d98' },
    quickBadge: {
        position: 'absolute', top: 12, right: 12,
        backgroundColor: '#ef4444', borderRadius: 10,
        minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 4,
    },
    quickBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
});
