
import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView,
    Pressable, useWindowDimensions,
    ActivityIndicator, TextInput, Modal, Platform, Alert
} from 'react-native';
import {
    Users, BookOpen, Clock, ChevronRight,
    ChevronDown, ChevronUp, Plus, Check, X, Paperclip
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// ── Department label helper ───────────────────────────────────────────────────
const DEPT_LABELS = {
    cs: 'Computer Science',
    it: 'Information Technology',
    mis: 'Management Information Systems',
};
const deptLabel = (d) => DEPT_LABELS[d] || (d ? d.toUpperCase() : 'Unknown');

// ── Time-parsing helper ───────────────────────────────────────────────────────
// Handles both range format "09:00 AM - 11:00 AM" and single time "8:30 AM"
function parseTimeRange(slot) {
    if (!slot) return { start: new Date(), end: new Date() };

    // Split on dash/en-dash surrounded by optional spaces
    const parts = slot.split(/\s*[-\u2013]\s*/).map(s => s.trim()).filter(Boolean);

    const toDate = (str) => {
        if (!str) return new Date();
        const trimmed = str.trim();
        // Find last space to split time from AM/PM
        const spaceIdx = trimmed.lastIndexOf(' ');
        if (spaceIdx === -1) return new Date(); // malformed
        const period = trimmed.substring(spaceIdx + 1).toUpperCase();
        const timePart = trimmed.substring(0, spaceIdx);
        const colonIdx = timePart.indexOf(':');
        let h, m;
        if (colonIdx === -1) {
            h = parseInt(timePart, 10);
            m = 0;
        } else {
            h = parseInt(timePart.substring(0, colonIdx), 10);
            m = parseInt(timePart.substring(colonIdx + 1), 10) || 0;
        }
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    };

    const start = toDate(parts[0]);
    // If there's an end time use it; otherwise assume 2-hour class
    const end = parts[1] ? toDate(parts[1]) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
}

// ── Free-slot computation ─────────────────────────────────────────────────────
const WORK_START_H = 7;
const WORK_END_H = 18;
const WORK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MIN_GAP_MINUTES = 60;

function formatTime(date) {
    let h = date.getHours();
    const m = date.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const mm = m === 0 ? '00' : String(m).padStart(2, '0');
    return `${h}:${mm} ${period}`;
}

function computeFreeSlots(daySessions) {
    const base = new Date();
    const workStart = new Date(base); workStart.setHours(WORK_START_H, 0, 0, 0);
    const workEnd = new Date(base); workEnd.setHours(WORK_END_H, 0, 0, 0);

    if (!daySessions || daySessions.length === 0) {
        return [`07:00 AM \u2013 06:00 PM  (${WORK_END_H - WORK_START_H} hrs free)`];
    }

    const parsed = daySessions.map(s => parseTimeRange(s.time_slot)).sort((a, b) => a.start - b.start);
    const gaps = [];
    let cursor = workStart;

    for (const sess of parsed) {
        const gapMins = (sess.start - cursor) / 60000;
        if (gapMins >= MIN_GAP_MINUTES) {
            const hrs = (gapMins / 60).toFixed(1).replace(/\.0$/, '');
            gaps.push(`${formatTime(cursor)} \u2013 ${formatTime(sess.start)}  (${hrs} hr${Number(hrs) !== 1 ? 's' : ''} free)`);
        }
        if (sess.end > cursor) cursor = sess.end;
    }

    const afterMins = (workEnd - cursor) / 60000;
    if (afterMins >= MIN_GAP_MINUTES) {
        const hrs = (afterMins / 60).toFixed(1).replace(/\.0$/, '');
        gaps.push(`${formatTime(cursor)} \u2013 ${formatTime(workEnd)}  (${hrs} hr${Number(hrs) !== 1 ? 's' : ''} free)`);
    }

    return gaps.length > 0 ? gaps : ['Fully booked today'];
}

const DAY_ORDER = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

// ── Main screen ───────────────────────────────────────────────────────────────
export default function LecturerClasses() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { user } = useAuth();
    const dept = user?.user_metadata?.department || null;
    const lecturerName = user?.user_metadata?.full_name || 'Unknown';
    const assignedCodes = Array.isArray(user?.user_metadata?.course_codes)
        ? user.user_metadata.course_codes
        : null;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dayGroups, setDayGroups] = useState([]);
    const [myCourses, setMyCourses] = useState([]);
    const [freeSlotOpen, setFreeSlotOpen] = useState(false);
    const [freeSlotsByDay, setFreeSlotsByDay] = useState({});

    // Add-course modal state
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [allCourses, setAllCourses] = useState([]);
    const [allCoursesLoading, setAllCoursesLoading] = useState(false);
    const [pendingCodes, setPendingCodes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [expandedDept, setExpandedDept] = useState(null);

    const fetchClasses = useCallback(async (overrideCodes) => {
        setLoading(true);
        setError(null);
        // Use overrideCodes if provided (right after a save), otherwise use state/metadata
        const codesToUse = overrideCodes !== undefined
            ? overrideCodes
            : (Array.isArray(user?.user_metadata?.course_codes) ? user.user_metadata.course_codes : null);

        try {
            let courses = [];
            if (codesToUse && codesToUse.length > 0) {
                const { data, error: ce } = await supabase
                    .from('courses').select('id, code, name, department, level')
                    .in('code', codesToUse).order('code');
                if (ce) throw ce;
                courses = data || [];
            } else if (dept) {
                const { data, error: ce } = await supabase
                    .from('courses').select('id, code, name, department, level')
                    .eq('department', dept).order('code');
                if (ce) throw ce;
                courses = data || [];
            }

            setMyCourses(courses);
            if (courses.length === 0) { setDayGroups([]); return; }

            const codes = courses.map(c => c.code);
            const { data: sessions, error: se } = await supabase
                .from('course_sessions').select('id, course_code, day, time_slot, location')
                .in('course_code', codes);
            if (se) throw se;

            const effectiveDept = dept || courses[0]?.department || null;

            const now = new Date();
            const enriched = (sessions || []).map(s => {
                const course = courses.find(c => c.code === s.course_code);
                const { start, end } = parseTimeRange(s.time_slot);
                return {
                    ...s,
                    courseName: course?.name || s.course_code,
                    courseLevel: course?.level || '',
                    courseDepartment: course?.department || effectiveDept || '',
                    start, end,
                    isLive: now >= start && now <= end,
                    isPast: now > end,
                };
            });

            const grouped = {};
            enriched.forEach(s => {
                if (!grouped[s.day]) grouped[s.day] = [];
                grouped[s.day].push(s);
            });
            Object.values(grouped).forEach(arr => arr.sort((a, b) => a.start - b.start));

            const groups = Object.entries(grouped)
                .sort(([a], [b]) => (DAY_ORDER[a] ?? 9) - (DAY_ORDER[b] ?? 9))
                .map(([day, sessions]) => ({ day, sessions }));
            setDayGroups(groups);

            const freeMap = {};
            WORK_DAYS.forEach(wd => {
                const daySess = enriched.filter(s => s.day === wd);
                freeMap[wd] = computeFreeSlots(daySess.length > 0 ? daySess : null);
            });
            setFreeSlotsByDay(freeMap);
        } catch (e) {
            console.error('[Classes] fetch:', e.message);
            setError('Failed to load classes. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [dept, user?.user_metadata?.course_codes]);

    useEffect(() => { fetchClasses(); }, [fetchClasses]);

    // ── Add-course modal ──────────────────────────────────────────────────────
    async function openAddModal() {
        setAddModalOpen(true);
        // Pre-select currently assigned courses
        setPendingCodes(assignedCodes ? [...assignedCodes] : myCourses.map(c => c.code));
        setExpandedDept(null); // reset
        setAllCoursesLoading(true);
        try {
            const { data, error } = await supabase
                .from('courses').select('id, code, name, department, level')
                .order('department').order('level').order('code');
            if (error) throw error;
            const fetched = data || [];
            setAllCourses(fetched);
            // Auto-expand the first department so the list is immediately visible
            if (fetched.length > 0) {
                const firstDept = fetched[0].department || 'other';
                setExpandedDept(firstDept);
            }
        } catch (e) {
            console.error('[Classes] loadAll:', e.message);
        } finally {
            setAllCoursesLoading(false);
        }
    }

    async function saveSelectedCourses() {
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { course_codes: pendingCodes },
            });
            if (error) throw error;
            setAddModalOpen(false);
            // Pass the new codes directly — don't wait for user object to refresh
            fetchClasses(pendingCodes);
        } catch (e) {
            console.error('[Classes] save:', e.message);
        } finally {
            setSaving(false);
        }
    }

    const coursesByDept = allCourses.reduce((acc, c) => {
        const key = c.department || 'other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(c);
        return acc;
    }, {});

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={[styles.title, isMobile && styles.mobileTitle]}>My Courses</Text>
                    <Text style={styles.subtitle}>Your teaching schedule grouped by day.</Text>
                </View>
                <Pressable style={styles.addBtn} onPress={openAddModal}>
                    <Plus size={18} color="white" />
                    <Text style={styles.addBtnText}>Add / Edit</Text>
                </Pressable>
            </View>

            {/* My courses list */}
            {myCourses.length > 0 && (
                <View style={styles.myCoursesRow}>
                    {myCourses.map(c => (
                        <View key={c.code} style={styles.courseChip}>
                            <Text style={styles.courseChipCode}>{c.code}</Text>
                            <Text style={styles.courseChipName} numberOfLines={1}>{c.name}</Text>
                            <View style={styles.courseChipDept}>
                                <Text style={styles.courseChipDeptText}>{deptLabel(c.department)}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {loading && <ActivityIndicator size="large" color="#102a43" style={{ marginVertical: 40 }} />}

            {!loading && error && (
                <View style={styles.errorState}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retryBtn} onPress={fetchClasses}>
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </View>
            )}

            {!loading && !error && dayGroups.length === 0 && (
                <View style={styles.emptyState}>
                    <BookOpen size={40} color="#d9e2ec" />
                    <Text style={styles.emptyTitle}>No teaching sessions scheduled.</Text>
                    <Text style={styles.emptySubtext}>
                        {myCourses.length === 0
                            ? 'Tap "Add / Edit" to select the courses you teach.'
                            : 'No timetable sessions found for your courses yet.'}
                    </Text>
                </View>
            )}

            {!loading && !error && dayGroups.map(({ day, sessions }) => (
                <View key={day} style={styles.dayGroup}>
                    <View style={styles.dayHeader}>
                        <Text style={styles.dayHeaderText}>{day}</Text>
                        <View style={styles.dayCountBadge}>
                            <Text style={styles.dayCountText}>
                                {sessions.length} {sessions.length === 1 ? 'class' : 'classes'}
                            </Text>
                        </View>
                    </View>
                    {sessions.map((s) => (
                        <ClassCard key={s.id ?? `${s.course_code}-${s.time_slot}`} session={s} lecturerName={lecturerName} lecturerId={user?.id} />
                    ))}
                </View>
            ))}

            {/* Free slots */}
            {!loading && !error && (
                <View style={styles.freeSlotsSection}>
                    <Pressable
                        onPress={() => setFreeSlotOpen(v => !v)}
                        style={({ pressed }) => [styles.freeSlotsHeader, pressed && { opacity: 0.85 }]}
                    >
                        <Text style={styles.freeSlotsTitle}>My Free Slots This Week</Text>
                        {freeSlotOpen ? <ChevronUp size={20} color="#102a43" /> : <ChevronDown size={20} color="#102a43" />}
                    </Pressable>
                    {freeSlotOpen && (
                        <View style={styles.freeSlotsBody}>
                            {WORK_DAYS.map(wd => {
                                const slots = freeSlotsByDay[wd] || ['Fully free \u2014 no lectures'];
                                return (
                                    <View key={wd} style={styles.freeSlotDay}>
                                        <Text style={styles.freeSlotDayName}>{wd}</Text>
                                        <View style={styles.freeSlotPills}>
                                            {slots.map((slot, i) => (
                                                <View
                                                    key={`${slot}-${i}`}
                                                    style={[
                                                        styles.freeSlotPill,
                                                        slot === 'Fully booked today' && styles.bookedPill,
                                                    ]}
                                                >
                                                    <Clock size={12} color={slot === 'Fully booked today' ? '#b45309' : '#166534'} style={{ marginRight: 4 }} />
                                                    <Text style={[styles.freeSlotPillText, slot === 'Fully booked today' && styles.bookedPillText]}>
                                                        {slot}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            )}

            {/* ── Add / Edit courses modal ─────────────────────────────────── */}
            <Modal
                visible={addModalOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setAddModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    {/* Fixed-height sheet so the inner list always has room */}
                    <View style={styles.modalSheet}>

                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Courses You Teach</Text>
                            <Pressable onPress={() => setAddModalOpen(false)} style={styles.modalClose}>
                                <X size={22} color="#627d98" />
                            </Pressable>
                        </View>

                        {/* Selection count banner */}
                        <View style={styles.selBanner}>
                            <Check size={14} color="#166534" />
                            <Text style={styles.selBannerText}>
                                {pendingCodes.length} course{pendingCodes.length !== 1 ? 's' : ''} selected
                                {allCourses.length > 0 ? ` of ${allCourses.length}` : ''}
                            </Text>
                        </View>

                        {/* Course list — takes all remaining space */}
                        <View style={styles.modalListArea}>
                            {allCoursesLoading ? (
                                <View style={styles.modalLoading}>
                                    <ActivityIndicator size="large" color="#102a43" />
                                    <Text style={styles.modalLoadingText}>Loading courses...</Text>
                                </View>
                            ) : allCourses.length === 0 ? (
                                <View style={styles.modalLoading}>
                                    <BookOpen size={40} color="#d9e2ec" />
                                    <Text style={styles.modalLoadingText}>No courses found in the database.</Text>
                                </View>
                            ) : (
                                <ScrollView
                                    showsVerticalScrollIndicator={true}
                                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {/* Group by department — render inline, no nested ScrollView */}
                                    {Object.entries(coursesByDept).map(([d, deptCourses]) => {
                                        const selCount = deptCourses.filter(c => pendingCodes.includes(c.code)).length;
                                        const isOpen = expandedDept === d;
                                        return (
                                            <View key={d} style={styles.deptGroup}>
                                                {/* Department header — tap to expand/collapse */}
                                                <Pressable
                                                    style={styles.deptHeader}
                                                    onPress={() => setExpandedDept(isOpen ? null : d)}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                        <Text style={styles.deptName}>{deptLabel(d)}</Text>
                                                        {selCount > 0 && (
                                                            <View style={styles.deptBadge}>
                                                                <Text style={styles.deptBadgeText}>{selCount} selected</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    {isOpen
                                                        ? <ChevronUp size={18} color="#486581" />
                                                        : <ChevronDown size={18} color="#486581" />}
                                                </Pressable>

                                                {/* Course rows — only shown when dept is expanded */}
                                                {isOpen && deptCourses.map(course => {
                                                    const picked = pendingCodes.includes(course.code);
                                                    return (
                                                        <Pressable
                                                            key={course.code}
                                                            style={[styles.courseItem, picked && styles.courseItemSelected]}
                                                            onPress={() => setPendingCodes(prev =>
                                                                prev.includes(course.code)
                                                                    ? prev.filter(c => c !== course.code)
                                                                    : [...prev, course.code]
                                                            )}
                                                        >
                                                            <View style={[styles.checkbox, picked && styles.checkboxChecked]}>
                                                                {picked && <Check size={12} color="white" />}
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={[styles.courseItemCode, picked && { color: '#1d4ed8' }]}>
                                                                    {course.code}
                                                                </Text>
                                                                <Text style={styles.courseItemName}>{course.name}</Text>
                                                            </View>
                                                            <View style={styles.levelPill}>
                                                                <Text style={styles.levelPillText}>Lvl {course.level}</Text>
                                                            </View>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>

                        {/* Save button — always visible at bottom */}
                        <View style={styles.modalFooter}>
                            <Pressable
                                style={[
                                    styles.saveCoursesBtn,
                                    (saving || pendingCodes.length === 0) && styles.saveCoursesBtnDisabled,
                                ]}
                                onPress={saveSelectedCourses}
                                disabled={saving || pendingCodes.length === 0}
                            >
                                {saving
                                    ? <ActivityIndicator color="white" />
                                    : <Text style={styles.saveCoursesBtnText}>
                                        Save ({pendingCodes.length} course{pendingCodes.length !== 1 ? 's' : ''})
                                      </Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

// ── ClassCard ─────────────────────────────────────────────────────────────────
function ClassCard({ session, lecturerName, lecturerId }) {
    const [expanded, setExpanded] = useState(false);
    const [outline, setOutline] = useState(null);
    const [outlineLoading, setOutlineLoading] = useState(false);
    const [roster, setRoster] = useState(null);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editText, setEditText] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    async function loadRoster() {
        if (!session.courseDepartment || !session.courseLevel) {
            setRoster([]);
            return;
        }
        setRosterLoading(true);
        try {
            // Fetch roster — use first 7 chars of UUID as index number (no index_number column needed)
            let data, error;
            ({ data, error } = await supabase
                .from('students')
                .select('full_name, id')
                .eq('department', session.courseDepartment)
                .eq('level', session.courseLevel)
                .order('full_name'));
            // Derive a display index from the UUID
            if (data) {
                data = data.map(s => ({
                    ...s,
                    index_number: (s.id || '').slice(0, 7).toUpperCase(),
                }));
            }
            if (error) throw error;
            setRoster(data || []);
        } catch (e) {
            console.error('[ClassCard] roster:', e.message);
            setRoster([]);
        } finally {
            setRosterLoading(false);
        }
    }

    async function handleToggle() {
        if (!expanded) {
            if (outline === null) {
                setOutlineLoading(true);
                try {
                    const { data, error } = await supabase
                        .from('course_outlines').select('outline, title')
                        .eq('course_code', session.course_code).single();
                    if (error && error.code !== 'PGRST116') console.error('[ClassCard]', error.message);
                    setOutline(data || null);
                } catch (e) { console.error('[ClassCard] toggle:', e.message); }
                finally { setOutlineLoading(false); }
            }
            if (roster === null) await loadRoster();
        }
        setExpanded(v => !v);
        setEditMode(false);
    }

    async function handleSave() {
        if (!editText.trim()) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('course_outlines').upsert({
                course_code: session.course_code,
                title: session.courseName,
                lecturer: lecturerName || 'Unknown',
                lecturer_id: lecturerId,
                outline: editText.trim(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'course_code' });
            if (error) { console.error('[ClassCard] save:', error.message); }
            else { setOutline({ outline: editText.trim(), title: session.courseName }); setEditMode(false); }
        } catch (e) { console.error('[ClassCard] handleSave:', e.message); }
        finally { setSaving(false); }
    }

    async function handleFileUpload() {
        try {
            setUploadingFile(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    '*/*',
                ],
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const asset = result.assets?.[0];
            if (!asset) return;

            const fileExtension = asset.name.split('.').pop().toLowerCase();
            
            if (fileExtension === 'txt' || asset.mimeType === 'text/plain') {
                // Read plain text files directly
                const response = await fetch(asset.uri);
                const text = await response.text();
                setEditText(text);
                Alert.alert('File loaded', `"${asset.name}" content loaded into the outline editor.`);
            } else if (fileExtension === 'docx') {
                // For .docx files - read as base64 and send to server for parsing
                try {
                    let base64;
                    if (Platform.OS === 'web') {
                        // On web, use fetch to get the file as array buffer then convert to base64
                        const response = await fetch(asset.uri);
                        const arrayBuffer = await response.arrayBuffer();
                        const binaryString = Array.from(new Uint8Array(arrayBuffer), (byte) =>
                            String.fromCharCode(byte)
                        ).join('');
                        base64 = btoa(binaryString);
                    } else {
                        // On mobile, use FileSystem
                        base64 = await FileSystem.readAsStringAsync(asset.uri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                    }
                    
                    // Send to server for parsing
                    const apiUrl = process.env.EXPO_PUBLIC_CHAT_API_URL || 'http://localhost:4000';
                    const parseResponse = await fetch(`${apiUrl}/api/parse-docx`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ base64, filename: asset.name }),
                    });
                    
                    if (parseResponse.ok) {
                        const { text } = await parseResponse.json();
                        setEditText(text);
                        Alert.alert('File loaded', `"${asset.name}" content loaded into the outline editor.`);
                    } else {
                        throw new Error('Server parsing failed');
                    }
                } catch (docxError) {
                    console.error('[DOCX Parse]', docxError.message);
                    const placeholder = `[Course outline from: ${asset.name}]\n\nPlease type or paste the outline content here, or use a .txt file for automatic import.`;
                    setEditText(prev => prev ? `${prev}\n\n${placeholder}` : placeholder);
                    Alert.alert(
                        'File attached',
                        `"${asset.name}" attached. Could not parse the file content. Please type the outline content manually or use a .txt file for auto-import.`
                    );
                }
            } else {
                // For PDF/old Word — insert a reference note (full parsing needs a server)
                const placeholder = `[Course outline from: ${asset.name}]\n\nPlease type or paste the outline content here, or use a .txt file for automatic import.`;
                setEditText(prev => prev ? `${prev}\n\n${placeholder}` : placeholder);
                Alert.alert(
                    'File attached',
                    `"${asset.name}" attached. For PDF/Word files, please type the outline content manually or use a .txt file for auto-import.`
                );
            }
        } catch (e) {
            console.error('[FileUpload]', e.message);
            Alert.alert('Upload failed', e.message);
        } finally {
            setUploadingFile(false);
        }
    }

    return (
        <>
            <Pressable
                style={[styles.classCard, session.isPast && { opacity: 0.55 }]}
                onPress={handleToggle}
            >
                <View style={styles.classIcon}>
                    <BookOpen size={22} color="#102a43" />
                </View>
                <View style={styles.classInfo}>
                    <Text style={styles.classCode}>{session.course_code}</Text>
                    <Text style={styles.className}>{session.courseName}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Clock size={13} color="#627d98" />
                            <Text style={styles.metaText}>{session.time_slot}</Text>
                        </View>
                        <Text style={styles.metaText}>{'• '}{session.location}</Text>
                        <View style={styles.metaItem}>
                            <Users size={13} color="#627d98" />
                            <Text style={styles.metaText}>Lvl {session.courseLevel || '—'}</Text>
                        </View>
                    </View>
                </View>
                {session.isLive && (
                    <View style={styles.liveNowBadge}>
                        <Text style={styles.liveNowText}>LIVE NOW</Text>
                    </View>
                )}
                {expanded ? <ChevronUp size={18} color="#9fb3c8" /> : <ChevronRight size={18} color="#9fb3c8" />}
                </Pressable>

            {expanded && (
                <View style={styles.outlinePanel}>
                    <Text style={styles.outlineTitle}>Class Roster</Text>
                    {rosterLoading && <ActivityIndicator size="small" color="#102a43" style={{ marginVertical: 8 }} />}
                    {!rosterLoading && roster && roster.length > 0 && (
                        <View style={styles.rosterList}>
                            {roster.map((student) => (
                                <View key={student.id || student.index_number} style={styles.rosterRow}>
                                    <Text style={styles.rosterName}>{student.full_name}</Text>
                                    <Text style={styles.rosterIndex}>{student.index_number || '—'}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {!rosterLoading && roster && roster.length === 0 && (
                        <Text style={styles.rosterEmpty}>No enrolled students found for this course level.</Text>
                    )}

                    {outlineLoading && <ActivityIndicator size="small" color="#102a43" style={{ marginVertical: 12 }} />}
                    {!outlineLoading && !editMode && (
                        <>
                            <Text style={styles.outlineTitle}>Course Outline</Text>
                            <Text style={styles.outlineText}>
                                {outline?.outline || 'No outline uploaded yet. Tap below to add one.'}
                            </Text>
                            <Pressable
                                style={styles.editOutlineBtn}
                                onPress={() => { setEditText(outline?.outline || ''); setEditMode(true); }}
                            >
                                <Text style={styles.editOutlineText}>{outline ? 'Edit Outline' : 'Add Outline'}</Text>
                            </Pressable>
                        </>
                    )}
                    {!outlineLoading && editMode && (
                        <>
                            {/* File upload button */}
                            <Pressable
                                style={styles.uploadBtn}
                                onPress={handleFileUpload}
                                disabled={uploadingFile}
                            >
                                {uploadingFile
                                    ? <ActivityIndicator size="small" color="#102a43" />
                                    : <>
                                        <Paperclip size={16} color="#486581" />
                                        <Text style={styles.uploadBtnText}>Upload File (PDF / TXT / Word)</Text>
                                      </>}
                            </Pressable>
                            <TextInput
                                style={styles.outlineInput}
                                multiline
                                placeholder="Enter course outline here, or upload a file above..."
                                placeholderTextColor="#9fb3c8"
                                value={editText}
                                onChangeText={setEditText}
                            />
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Pressable style={[styles.editOutlineBtn, { backgroundColor: '#f0f4f8' }]} onPress={() => setEditMode(false)}>
                                    <Text style={[styles.editOutlineText, { color: '#486581' }]}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.editOutlineBtn, saving && { opacity: 0.6 }]}
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.editOutlineText}>Save</Text>}
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            )}
        </>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    scrollArea: { flex: 1 },
    scrollContent: { padding: 40 },
    mobileScrollContent: { padding: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
    title: { fontSize: 32, fontWeight: '900', color: '#102a43' },
    mobileTitle: { fontSize: 24 },
    subtitle: { fontSize: 16, color: '#486581', marginTop: 4 },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#102a43', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, gap: 6 },
    addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    myCoursesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
    courseChip: { backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e1e7ec', minWidth: 140, maxWidth: 200 },
    courseChipCode: { fontSize: 11, fontWeight: 'bold', color: '#3b82f6', marginBottom: 2 },
    courseChipName: { fontSize: 13, fontWeight: '600', color: '#102a43', marginBottom: 6 },
    courseChipDept: { backgroundColor: '#f0f4f8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
    courseChipDeptText: { fontSize: 10, color: '#486581', fontWeight: '600' },
    dayGroup: { marginBottom: 32 },
    dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    dayHeaderText: { fontSize: 18, fontWeight: 'bold', color: '#102a43' },
    dayCountBadge: { marginLeft: 12, backgroundColor: '#e1e7ec', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    dayCountText: { fontSize: 12, fontWeight: 'bold', color: '#486581' },
    classCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e1e7ec' },
    classIcon: { width: 48, height: 48, backgroundColor: '#f0f4f8', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    classInfo: { flex: 1 },
    classCode: { fontSize: 12, fontWeight: 'bold', color: '#3b82f6', marginBottom: 2 },
    className: { fontSize: 17, fontWeight: 'bold', color: '#102a43', marginBottom: 6 },
    metaRow: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#627d98', fontWeight: '500' },
    liveNowBadge: { backgroundColor: '#16a34a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
    liveNowText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    outlinePanel: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e1e7ec' },
    outlineTitle: { fontSize: 13, fontWeight: 'bold', color: '#102a43', marginBottom: 6 },
    outlineText: { fontSize: 14, color: '#486581', lineHeight: 22, marginBottom: 14 },
    editOutlineBtn: { backgroundColor: '#102a43', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
    editOutlineText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    outlineInput: { backgroundColor: '#f0f4f8', borderRadius: 10, padding: 12, fontSize: 14, color: '#102a43', minHeight: 120, textAlignVertical: 'top', marginBottom: 10 },
    uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: '#d9e2ec', gap: 8 },
    uploadBtnText: { fontSize: 13, fontWeight: '600', color: '#486581' },
    rosterList: { marginBottom: 20, gap: 6 },
    rosterRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 10, borderWidth: 1, borderColor: '#e1e7ec',
    },
    rosterName: { fontSize: 14, fontWeight: '600', color: '#102a43', flex: 1 },
    rosterIndex: { fontSize: 12, color: '#627d98', fontWeight: '500' },
    rosterEmpty: { fontSize: 13, color: '#9fb3c8', marginBottom: 16, fontStyle: 'italic' },
    emptyState: { backgroundColor: 'white', borderRadius: 20, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#e1e7ec' },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43', marginTop: 14 },
    emptySubtext: { fontSize: 14, color: '#9fb3c8', marginTop: 8, textAlign: 'center' },
    errorState: { padding: 32, alignItems: 'center' },
    errorText: { fontSize: 15, color: '#ef4444', marginBottom: 16 },
    retryBtn: { backgroundColor: '#102a43', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
    retryText: { color: 'white', fontWeight: 'bold' },
    freeSlotsSection: { backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e1e7ec', marginTop: 8, overflow: 'hidden' },
    freeSlotsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    freeSlotsTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43' },
    freeSlotsBody: { borderTopWidth: 1, borderTopColor: '#f0f4f8', padding: 20 },
    freeSlotDay: { marginBottom: 18 },
    freeSlotDayName: { fontSize: 14, fontWeight: 'bold', color: '#102a43', marginBottom: 8 },
    freeSlotPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    freeSlotPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    freeSlotPillText: { fontSize: 12, color: '#166534', fontWeight: '600' },
    bookedPill: { backgroundColor: '#fffbeb' },
    bookedPillText: { color: '#b45309' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(16,42,67,0.45)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '82%',          // fixed height so inner ScrollView has room
        paddingTop: 8,
        overflow: 'hidden',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4f8' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43' },
    modalClose: { padding: 4 },
    selBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#bbf7d0' },
    selBannerText: { fontSize: 13, fontWeight: '600', color: '#166534', marginLeft: 8 },
    modalListArea: { flex: 1 },   // takes all space between banner and footer
    modalLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    modalLoadingText: { marginTop: 12, fontSize: 15, color: '#9fb3c8', textAlign: 'center' },
    deptGroup: { marginBottom: 16, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e1e7ec', overflow: 'hidden' },
    deptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#f8fafc' },
    deptName: { fontSize: 15, fontWeight: 'bold', color: '#102a43' },
    deptBadge: { marginLeft: 10, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    deptBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#166534' },
    courseItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#f0f4f8' },
    courseItemSelected: { backgroundColor: '#eff6ff' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d9e2ec', backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    checkboxChecked: { backgroundColor: '#102a43', borderColor: '#102a43' },
    courseItemCode: { fontSize: 12, fontWeight: 'bold', color: '#627d98', marginBottom: 2 },
    courseItemName: { fontSize: 14, fontWeight: '600', color: '#102a43' },
    levelPill: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    levelPillText: { fontSize: 11, fontWeight: 'bold', color: '#0369a1' },
    modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#e1e7ec', backgroundColor: 'white' },
    saveCoursesBtn: { backgroundColor: '#102a43', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    saveCoursesBtnDisabled: { opacity: 0.45 },
    saveCoursesBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    classList: { gap: 16 },
});
