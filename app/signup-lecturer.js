import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput,
    Pressable, KeyboardAvoidingView,
    Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
    GraduationCap, ArrowLeft, Mail, Lock, User, Key,
    BookOpen, Check, ChevronDown, ChevronUp
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

const INVITE_CODE = process.env.EXPO_PUBLIC_LECTURER_INVITE_CODE || 'GIMPA-STAFF-2026';

// ── Step constants ────────────────────────────────────────────────────────────
const STEP_DETAILS  = 'details';   // name / email / password / invite code
const STEP_COURSES  = 'courses';   // pick courses from DB
const STEP_SUCCESS  = 'success';   // done

export default function LecturerSignupScreen() {
    const router = useRouter();

    // ── Step 1 state ─────────────────────────────────────────────────────────
    const [step, setStep]             = useState(STEP_DETAILS);
    const [fullName, setFullName]     = useState('');
    const [email, setEmail]           = useState('');
    const [password, setPassword]     = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [detailsError, setDetailsError] = useState('');

    // ── Step 2 state ─────────────────────────────────────────────────────────
    const [allCourses, setAllCourses]       = useState([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [selectedCodes, setSelectedCodes] = useState([]);
    const [expandedDept, setExpandedDept]   = useState(null);
    const [coursesError, setCoursesError]   = useState('');

    // ── Submission state ──────────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // ── Load all courses when entering step 2 ────────────────────────────────
    useEffect(() => {
        if (step !== STEP_COURSES) return;
        (async () => {
            setCoursesLoading(true);
            setCoursesError('');
            try {
                const { data, error } = await supabase
                    .from('courses')
                    .select('id, code, name, department, level')
                    .order('department')
                    .order('level')
                    .order('code');
                if (error) throw error;
                setAllCourses(data || []);
            } catch (e) {
                console.error('[LecturerSignup] courses:', e.message);
                setCoursesError('Could not load courses. Check your connection and try again.');
            } finally {
                setCoursesLoading(false);
            }
        })();
    }, [step]);

    // ── Group courses by department for display ───────────────────────────────
    const coursesByDept = allCourses.reduce((acc, c) => {
        const key = c.department || 'Other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(c);
        return acc;
    }, {});

    const DEPT_LABELS = { cs: 'Computer Science', it: 'Information Technology', mis: 'Management Information Systems' };
    const deptLabel = (d) => DEPT_LABELS[d] || d.toUpperCase();

    function toggleCourse(code) {
        setSelectedCodes(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    }

    function toggleDeptExpand(dept) {
        setExpandedDept(prev => (prev === dept ? null : dept));
    }

    // ── Step 1 → Step 2 ───────────────────────────────────────────────────────
    function handleDetailsNext() {
        setDetailsError('');
        if (!fullName.trim() || !email.trim() || !password || !inviteCode.trim()) {
            setDetailsError('Please fill in all fields.');
            return;
        }
        if (inviteCode.trim().toUpperCase() !== INVITE_CODE.toUpperCase()) {
            setDetailsError('Invalid staff invite code.');
            return;
        }
        if (password.length < 6) {
            setDetailsError('Password must be at least 6 characters.');
            return;
        }
        setStep(STEP_COURSES);
    }

    // ── Step 2 → Create account ───────────────────────────────────────────────
    async function handleCreateAccount() {
        setSubmitError('');
        if (selectedCodes.length === 0) {
            setSubmitError('Please select at least one course you teach.');
            return;
        }

        setSubmitting(true);
        try {
            // Derive department from the first selected course
            const firstCourse = allCourses.find(c => selectedCodes.includes(c.code));
            const dept = firstCourse?.department || '';

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        role: 'lecturer',
                        full_name: fullName.trim(),
                        department: dept,
                        faculty: deptLabel(dept),
                        staff_id: '',
                        // Store the exact course codes this lecturer teaches
                        course_codes: selectedCodes,
                    },
                },
            });

            if (signUpError) {
                setSubmitError(signUpError.message);
                return;
            }

            // If Supabase returns a session immediately (email confirm disabled),
            // sign out so the lecturer goes through the normal login flow.
            if (data?.session) {
                await supabase.auth.signOut();
            }

            setStep(STEP_SUCCESS);
        } catch (e) {
            console.error('[LecturerSignup] create:', e.message);
            setSubmitError('An unexpected error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
    if (step === STEP_SUCCESS) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar style="auto" />
                <View style={styles.successWrapper}>
                    <View style={styles.successIcon}>
                        <GraduationCap size={48} color="white" />
                    </View>
                    <Text style={styles.successTitle}>Account Created!</Text>
                    <Text style={styles.successMessage}>
                        Your lecturer account has been created with {selectedCodes.length} course{selectedCodes.length !== 1 ? 's' : ''} assigned.
                        You can now log in with your email and password.
                    </Text>
                    <Pressable style={styles.backToLoginBtn} onPress={() => router.replace('/login')}>
                        <Text style={styles.backToLoginText}>Go to Login</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // ── STEP 2 — COURSE PICKER ────────────────────────────────────────────────
    if (step === STEP_COURSES) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar style="auto" />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.coursePickerHeader}>
                        <Pressable onPress={() => setStep(STEP_DETAILS)} style={styles.backButton}>
                            <ArrowLeft size={24} color="#102a43" />
                        </Pressable>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={styles.coursePickerTitle}>Select Your Courses</Text>
                            <Text style={styles.coursePickerSubtitle}>
                                Choose every course you currently teach
                            </Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    {selectedCodes.length > 0 && (
                        <View style={styles.selectionBanner}>
                            <Check size={14} color="#166534" />
                            <Text style={styles.selectionBannerText}>
                                {selectedCodes.length} course{selectedCodes.length !== 1 ? 's' : ''} selected
                            </Text>
                        </View>
                    )}

                    {coursesLoading ? (
                        <View style={styles.centerLoader}>
                            <ActivityIndicator size="large" color="#102a43" />
                            <Text style={styles.loadingText}>Loading courses...</Text>
                        </View>
                    ) : coursesError ? (
                        <View style={styles.centerLoader}>
                            <Text style={styles.errorText}>{coursesError}</Text>
                            <Pressable style={styles.retryBtn} onPress={() => setStep(STEP_COURSES)}>
                                <Text style={styles.retryText}>Retry</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.courseScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {Object.entries(coursesByDept).map(([dept, courses]) => {
                                const isOpen = expandedDept === dept;
                                const deptSelected = courses.filter(c => selectedCodes.includes(c.code)).length;
                                return (
                                    <View key={dept} style={styles.deptGroup}>
                                        <Pressable
                                            style={styles.deptHeader}
                                            onPress={() => toggleDeptExpand(dept)}
                                        >
                                            <View style={styles.deptHeaderLeft}>
                                                <Text style={styles.deptName}>{deptLabel(dept)}</Text>
                                                {deptSelected > 0 && (
                                                    <View style={styles.deptBadge}>
                                                        <Text style={styles.deptBadgeText}>{deptSelected} selected</Text>
                                                    </View>
                                                )}
                                            </View>
                                            {isOpen
                                                ? <ChevronUp size={18} color="#486581" />
                                                : <ChevronDown size={18} color="#486581" />}
                                        </Pressable>

                                        {isOpen && courses.map(course => {
                                            const picked = selectedCodes.includes(course.code);
                                            return (
                                                <Pressable
                                                    key={course.code}
                                                    style={[styles.courseItem, picked && styles.courseItemSelected]}
                                                    onPress={() => toggleCourse(course.code)}
                                                >
                                                    <View style={styles.courseItemLeft}>
                                                        <View style={[styles.courseCheckbox, picked && styles.courseCheckboxChecked]}>
                                                            {picked && <Check size={12} color="white" />}
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.courseItemCode, picked && styles.courseItemCodeSelected]}>
                                                                {course.code}
                                                            </Text>
                                                            <Text style={[styles.courseItemName, picked && styles.courseItemNameSelected]}>
                                                                {course.name}
                                                            </Text>
                                                        </View>
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

                            {allCourses.length === 0 && (
                                <View style={styles.centerLoader}>
                                    <BookOpen size={40} color="#d9e2ec" />
                                    <Text style={styles.emptyCoursesText}>
                                        No courses found in the database yet.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    )}

                    {submitError ? (
                        <Text style={styles.submitErrorText}>{submitError}</Text>
                    ) : null}

                    <View style={styles.coursePickerFooter}>
                        <Pressable
                            style={[
                                styles.createBtn,
                                (submitting || selectedCodes.length === 0) && styles.createBtnDisabled,
                            ]}
                            onPress={handleCreateAccount}
                            disabled={submitting || selectedCodes.length === 0}
                        >
                            {submitting
                                ? <ActivityIndicator color="white" />
                                : <Text style={styles.createBtnText}>
                                    Create Account ({selectedCodes.length} course{selectedCodes.length !== 1 ? 's' : ''})
                                  </Text>}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // ── STEP 1 — DETAILS ─────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}
                    >
                        <ArrowLeft size={24} color="#102a43" />
                    </Pressable>

                    <View style={styles.header}>
                        <View style={styles.logoIcon}>
                            <GraduationCap size={40} color="white" />
                        </View>
                        <Text style={styles.title}>Staff Sign Up</Text>
                        <Text style={styles.subtitle}>
                            Create your lecturer account. You will choose your courses on the next step.
                        </Text>
                    </View>

                    <View style={styles.stepIndicator}>
                        <View style={[styles.stepDot, styles.stepDotActive]} />
                        <View style={styles.stepLine} />
                        <View style={styles.stepDot} />
                    </View>
                    <Text style={styles.stepLabel}>Step 1 of 2 — Your Details</Text>

                    <View style={styles.form}>
                        {/* Full Name */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <User size={20} color="#9fb3c8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Dr. Ama Mensah"
                                    placeholderTextColor="#9fb3c8"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color="#9fb3c8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@gimpa.edu.gh"
                                    placeholderTextColor="#9fb3c8"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color="#9fb3c8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="At least 6 characters"
                                    placeholderTextColor="#9fb3c8"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <Pressable onPress={() => setShowPassword(v => !v)} style={{ padding: 8 }}>
                                    <Text style={{ fontSize: 12, color: '#9fb3c8', fontWeight: '600' }}>
                                        {showPassword ? 'HIDE' : 'SHOW'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Invite Code */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Staff Invite Code</Text>
                            <View style={styles.inputWrapper}>
                                <Key size={20} color="#9fb3c8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter invite code"
                                    placeholderTextColor="#9fb3c8"
                                    value={inviteCode}
                                    onChangeText={setInviteCode}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        {detailsError ? <Text style={styles.errorText}>{detailsError}</Text> : null}

                        <Pressable
                            style={styles.nextButton}
                            onPress={handleDetailsNext}
                        >
                            <Text style={styles.nextButtonText}>Next — Choose Courses</Text>
                        </Pressable>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <Pressable onPress={() => router.replace('/login')}>
                                <Text style={styles.footerLink}>Sign In</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    scrollContent: { padding: 24, flexGrow: 1, justifyContent: 'center', maxWidth: 500, width: '100%', alignSelf: 'center' },
    backButton: { position: 'absolute', top: 20, left: 20, padding: 8, borderRadius: 12, backgroundColor: '#f0f4f8', zIndex: 10 },
    header: { alignItems: 'center', marginBottom: 24, marginTop: 60 },
    logoIcon: { backgroundColor: '#102a43', padding: 16, borderRadius: 20, marginBottom: 20 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#102a43', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#486581', textAlign: 'center', lineHeight: 22 },
    stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#d9e2ec' },
    stepDotActive: { backgroundColor: '#102a43' },
    stepLine: { width: 40, height: 2, backgroundColor: '#d9e2ec', marginHorizontal: 6 },
    stepLabel: { textAlign: 'center', fontSize: 12, color: '#9fb3c8', fontWeight: '600', marginBottom: 24 },
    form: { width: '100%' },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#102a43', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d9e2ec', borderRadius: 12, paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, height: 52, fontSize: 16, color: '#102a43' },
    errorText: { color: '#ef4444', fontSize: 14, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
    nextButton: { backgroundColor: '#102a43', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8, shadowColor: '#102a43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    nextButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: '#486581', fontSize: 15 },
    footerLink: { color: '#102a43', fontSize: 15, fontWeight: '700' },

    // ── Course picker ──────────────────────────────────────────────────────────
    coursePickerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e1e7ec', backgroundColor: 'white' },
    coursePickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43' },
    coursePickerSubtitle: { fontSize: 13, color: '#627d98', marginTop: 2 },
    selectionBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#bbf7d0' },
    selectionBannerText: { fontSize: 13, fontWeight: '600', color: '#166534', marginLeft: 8 },
    courseScrollContent: { padding: 20, paddingBottom: 40 },
    deptGroup: { marginBottom: 16, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e1e7ec', overflow: 'hidden' },
    deptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#f8fafc' },
    deptHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    deptName: { fontSize: 15, fontWeight: 'bold', color: '#102a43' },
    deptBadge: { marginLeft: 10, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    deptBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#166534' },
    courseItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#f0f4f8' },
    courseItemSelected: { backgroundColor: '#eff6ff' },
    courseItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    courseCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d9e2ec', backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    courseCheckboxChecked: { backgroundColor: '#102a43', borderColor: '#102a43' },
    courseItemCode: { fontSize: 12, fontWeight: 'bold', color: '#627d98', marginBottom: 2 },
    courseItemCodeSelected: { color: '#1d4ed8' },
    courseItemName: { fontSize: 14, fontWeight: '600', color: '#102a43' },
    courseItemNameSelected: { color: '#102a43' },
    levelPill: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    levelPillText: { fontSize: 11, fontWeight: 'bold', color: '#0369a1' },
    centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText: { marginTop: 12, fontSize: 15, color: '#627d98' },
    emptyCoursesText: { marginTop: 16, fontSize: 15, color: '#9fb3c8', textAlign: 'center' },
    retryBtn: { marginTop: 16, backgroundColor: '#102a43', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
    retryText: { color: 'white', fontWeight: 'bold' },
    submitErrorText: { color: '#ef4444', fontSize: 13, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20, marginBottom: 8 },
    coursePickerFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#e1e7ec', backgroundColor: 'white' },
    createBtn: { backgroundColor: '#102a43', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#102a43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    createBtnDisabled: { opacity: 0.45 },
    createBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

    // ── Success ────────────────────────────────────────────────────────────────
    successWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    successIcon: { backgroundColor: '#16a34a', padding: 24, borderRadius: 40, marginBottom: 24 },
    successTitle: { fontSize: 28, fontWeight: '900', color: '#102a43', marginBottom: 16, textAlign: 'center' },
    successMessage: { fontSize: 16, color: '#486581', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
    backToLoginBtn: { backgroundColor: '#102a43', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12 },
    backToLoginText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
