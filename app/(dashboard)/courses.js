import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, ScrollView, Pressable,
    useWindowDimensions, ActivityIndicator, TextInput
} from 'react-native';
import { ChevronRight, BookOpen, Search, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

const DEPT_LABELS = {
    cs: 'Computer Science',
    it: 'Information Technology',
    mis: 'Management Information Systems',
};

export default function CoursesScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { user, isVisitor } = useAuth();
    const router = useRouter();

    const [myCourses, setMyCourses]     = useState([]);
    const [loading, setLoading]         = useState(true);
    const [studentInfo, setStudentInfo] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // ── Visitor hard guard ────────────────────────────────────────────────────
    useEffect(() => {
        if (isVisitor) {
            router.replace('/(dashboard)');
        }
    }, [isVisitor, router]);

    // ── Fetch courses ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (isVisitor || !user) return;

        const fetchCourses = async () => {
            setLoading(true);

            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('department, level')
                .eq('id', user.id)
                .single();

            let active = student || {};
            if (studentError || !active.department || !active.level) {
                const meta = user.user_metadata || {};
                active = {
                    department: active.department || meta.department || meta.course || 'cs',
                    level:      active.level      || meta.level      || '100',
                };
            }
            setStudentInfo(active);

            if (!active.department || !active.level) { setLoading(false); return; }

            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('department', active.department.trim())
                .eq('level', active.level.toString().trim())
                .order('code');

            if (error) console.error('[Courses] fetch:', error.message);
            else setMyCourses(data || []);

            setLoading(false);
        };

        fetchCourses();
    }, [user, isVisitor]);

    // ── Client-side search filter ─────────────────────────────────────────────
    const filtered = searchQuery.trim().length === 0
        ? myCourses
        : myCourses.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.code.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const deptDisplay = studentInfo?.department
        ? (DEPT_LABELS[studentInfo.department] || studentInfo.department)
        : 'Unknown Department';

    if (isVisitor) return null; // render nothing while redirect fires

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
            accessible
            accessibilityLabel="My Courses screen"
        >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.headerSection}>
                <Text
                    style={[styles.title, isMobile && styles.mobileTitle]}
                    accessibilityRole="header"
                >
                    My Courses
                </Text>
                <Text style={styles.subtitle} accessibilityLabel={`${deptDisplay}, Spring Semester 2026`}>
                    {deptDisplay} • Spring Semester 2026
                </Text>
            </View>

            {/* ── Search bar ─────────────────────────────────────────────── */}
            <View
                style={styles.searchBar}
                accessible
                accessibilityLabel="Search courses"
                accessibilityHint="Type a course name or code to filter the list"
            >
                <Search size={18} color="#9fb3c8" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or code…"
                    placeholderTextColor="#9fb3c8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                    accessibilityLabel="Course search input"
                />
                {searchQuery.length > 0 && (
                    <Pressable
                        onPress={() => setSearchQuery('')}
                        accessibilityLabel="Clear search"
                        accessibilityRole="button"
                    >
                        <X size={18} color="#9fb3c8" />
                    </Pressable>
                )}
            </View>

            {/* ── Results count ──────────────────────────────────────────── */}
            {!loading && searchQuery.length > 0 && (
                <Text style={styles.resultCount} accessibilityLiveRegion="polite">
                    {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchQuery}"
                </Text>
            )}

            {/* ── List ───────────────────────────────────────────────────── */}
            {loading ? (
                <ActivityIndicator
                    size="large"
                    color="#102a43"
                    style={{ marginTop: 40 }}
                    accessibilityLabel="Loading courses"
                />
            ) : filtered.length > 0 ? (
                <View style={styles.listContainer}>
                    {filtered.map(course => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </View>
            ) : (
                <View
                    style={styles.emptyState}
                    accessible
                    accessibilityLabel={
                        searchQuery.length > 0
                            ? `No courses match "${searchQuery}"`
                            : 'No courses found. Please ensure your profile is set up.'
                    }
                >
                    <Text style={styles.emptyText}>
                        {searchQuery.length > 0
                            ? `No courses match "${searchQuery}".`
                            : 'No courses found. Please ensure your profile (Department and Level) is completely set up.'}
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}

function CourseCard({ course }) {
    const router = useRouter();
    return (
        <Pressable
            style={styles.card}
            onPress={() => router.push(`/course/${course.code}`)}
            accessibilityRole="button"
            accessibilityLabel={`${course.code}: ${course.name}. Tap to view course details.`}
        >
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconBox} accessibilityElementsHidden>
                        <BookOpen size={20} color="#102a43" />
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={styles.courseCode}>{course.code}</Text>
                        <Text style={styles.courseName}>{course.name}</Text>
                        {course.description ? (
                            <Text style={styles.courseDescription} numberOfLines={2}>
                                {course.description}
                            </Text>
                        ) : null}
                    </View>
                </View>
                <View style={styles.headerRight} accessibilityElementsHidden>
                    <ChevronRight size={24} color="#9fb3c8" />
                </View>
            </View>
            </Pressable>
    );
}

const styles = StyleSheet.create({
    scrollArea: { flex: 1 },
    scrollContent: { padding: 40, maxWidth: 800, alignSelf: 'center', width: '100%' },
    mobileScrollContent: { padding: 20 },
    headerSection: { marginBottom: 24 },
    title: { fontSize: 32, fontWeight: '900', color: '#102a43' },
    mobileTitle: { fontSize: 24 },
    subtitle: { fontSize: 16, color: '#486581', marginTop: 8 },

    // Search bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e1e7ec',
        paddingHorizontal: 16,
        height: 52,
        marginBottom: 12,
        shadowColor: '#102a43',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#102a43',
        height: '100%',
    },
    resultCount: {
        fontSize: 13,
        color: '#627d98',
        marginBottom: 16,
        fontWeight: '500',
    },

    listContainer: { gap: 16, marginTop: 8 },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e1e7ec',
        overflow: 'hidden',
        shadowColor: '#102a43',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        backgroundColor: '#f0f4f8',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: { flex: 1 },
    courseCode: { fontSize: 14, fontWeight: 'bold', color: '#627d98', marginBottom: 4 },
    courseName: { fontSize: 18, fontWeight: 'bold', color: '#102a43' },
    courseDescription: { fontSize: 13, color: '#627d98', marginTop: 6, lineHeight: 18 },
    headerRight: { paddingLeft: 16 },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 20,
        marginTop: 8,
    },
    emptyText: { fontSize: 16, color: '#627d98', fontWeight: '500', textAlign: 'center' },
});
