import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView,
    Pressable, Switch, useWindowDimensions,
    Platform, ActivityIndicator, Modal, TextInput,
    KeyboardAvoidingView, Alert
} from 'react-native';
import {
    User, Mail, Book, Fingerprint, School,
    Settings, Bell, Shield, Lock, LogOut,
    ChevronRight, Briefcase, Edit, X, Save
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const DEPT_LABELS = {
    cs: 'Computer Science',
    it: 'Information Technology',
    mis: 'Management Information Systems',
};

export default function LecturerProfileScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const router = useRouter();

    const { user, signOut } = useAuth();

    // ── Derived display values (re-read after edits) ──────────────────────────
    const [localMeta, setLocalMeta] = useState(null);
    const meta = localMeta || user?.user_metadata || {};

    const fullName     = meta.full_name   || 'Lecturer';
    const email        = user?.email      || '—';
    const faculty      = meta.faculty     || '—';
    const rawDept      = meta.department  || '';
    const department   = DEPT_LABELS[rawDept] || (rawDept ? rawDept.toUpperCase() : '—');
    const staffId      = meta.staff_id
        ? String(meta.staff_id)
        : 'STF-' + (user?.id?.slice(0, 6).toUpperCase() || '------');
    const avatarLetter = fullName.charAt(0).toUpperCase();
    const assignedCodes = Array.isArray(meta.course_codes) ? meta.course_codes : null;

    const [notifications, setNotifications] = useState(true);
    const [biometrics, setBiometrics] = useState(false);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const [statsLoading, setStatsLoading] = useState(true);
    const [courseCount, setCourseCount] = useState('—');

    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const dept = rawDept || null;
            let ccRes;
            if (assignedCodes && assignedCodes.length > 0) {
                ccRes = await supabase.from('courses')
                    .select('id', { count: 'exact', head: true })
                    .in('code', assignedCodes);
            } else if (dept) {
                ccRes = await supabase.from('courses')
                    .select('id', { count: 'exact', head: true })
                    .eq('department', dept);
            } else {
                ccRes = { count: 0, error: null };
            }
            if (ccRes.error) console.error('[Profile] courses:', ccRes.error.message);
            else setCourseCount(String(ccRes.count || 0));
        } catch (e) {
            console.error('[Profile] fetchStats:', e.message);
        } finally {
            setStatsLoading(false);
        }
    }, [assignedCodes, rawDept]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    // ── Edit modal ────────────────────────────────────────────────────────────
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editFaculty, setEditFaculty] = useState('');
    const [editDept, setEditDept] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    function openEdit() {
        setEditName(fullName !== 'Lecturer' ? fullName : '');
        setEditFaculty(faculty !== '—' ? faculty : '');
        setEditDept(rawDept || '');
        setIsEditing(true);
    }

    async function handleSave() {
        if (!editName.trim()) {
            Alert.alert('Required', 'Please enter your full name.');
            return;
        }
        setIsSaving(true);
        try {
            const { data, error } = await supabase.auth.updateUser({
                data: {
                    full_name: editName.trim(),
                    faculty: editFaculty.trim(),
                    department: editDept,
                },
            });
            if (error) {
                Alert.alert('Error', error.message);
                return;
            }
            // Reflect changes immediately without waiting for a session refresh
            setLocalMeta({
                ...meta,
                full_name: editName.trim(),
                faculty: editFaculty.trim(),
                department: editDept,
            });
            setIsEditing(false);
        } catch (e) {
            console.error('[Profile] save:', e.message);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    }

    const handleSignOut = async () => {
        await signOut();
        router.replace('/login');
    };

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
        >
            {/* Profile Header */}
            <View style={[styles.profileHeader, isMobile && styles.mobileProfileHeader]}>
                <View style={styles.largeAvatar}>
                    <Text style={styles.largeAvatarText}>{avatarLetter}</Text>
                </View>
                <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.userName}>{fullName}</Text>
                        <Pressable style={styles.editBtn} onPress={openEdit}>
                            <Edit size={15} color="#486581" />
                            <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                    </View>
                    <Text style={styles.userTitle}>{faculty !== '—' ? faculty : 'Faculty Member'}</Text>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Active Lecturer</Text>
                    </View>
                </View>
            </View>

            {/* Courses stat */}
            <View style={styles.statsRow}>
                {statsLoading ? (
                    <ActivityIndicator size="small" color="#102a43" />
                ) : (
                    <StatCard label="COURSES I TEACH" value={courseCount} icon={<Book size={18} color="#22c55e" />} />
                )}
            </View>

            <View style={[styles.mainLayout, isMobile && styles.mobileMainLayout]}>
                {/* Faculty Info */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <User size={20} color="#102a43" />
                        <Text style={styles.sectionTitle}>Faculty Information</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <InfoItem icon={<Fingerprint size={18} />} label="Staff ID" value={staffId} />
                        <InfoItem icon={<Mail size={18} />} label="Email Address" value={email} />
                        <InfoItem icon={<School size={18} />} label="Faculty" value={faculty} />
                        <InfoItem icon={<Briefcase size={18} />} label="Department" value={department} />
                    </View>
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Settings size={20} color="#102a43" />
                        <Text style={styles.sectionTitle}>Preferences</Text>
                    </View>
                    <View style={styles.settingsCard}>
                        <SettingToggle icon={<Bell size={18} />} label="Push Notifications" value={notifications} onValueChange={setNotifications} />
                        <SettingToggle icon={<Shield size={18} />} label="Biometric Login" value={biometrics} onValueChange={setBiometrics} />
                        <Pressable style={styles.settingItem} onPress={() => { /* placeholder */ }}>
                            <View style={styles.settingLabelContainer}>
                                <Lock size={18} color="#627d98" />
                                <Text style={styles.settingLabel}>Change Password</Text>
                            </View>
                            <ChevronRight size={18} color="#cbd5e0" />
                        </Pressable>
                        <Pressable style={[styles.settingItem, styles.lastItem]} onPress={handleSignOut}>
                            <View style={styles.settingLabelContainer}>
                                <LogOut size={18} color="#ef4444" />
                                <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Sign Out</Text>
                            </View>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* ── Edit Profile Modal ──────────────────────────────────────── */}
            <Modal
                visible={isEditing}
                animationType="slide"
                transparent
                onRequestClose={() => setIsEditing(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <Pressable onPress={() => setIsEditing(false)} style={styles.modalClose}>
                                <X size={22} color="#627d98" />
                            </Pressable>
                        </View>

                        <ScrollView
                            contentContainerStyle={styles.modalScroll}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Avatar preview */}
                            <View style={styles.avatarPreviewRow}>
                                <View style={styles.avatarPreview}>
                                    <Text style={styles.avatarPreviewText}>
                                        {editName ? editName.charAt(0).toUpperCase() : avatarLetter}
                                    </Text>
                                </View>
                            </View>

                            {/* Full Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Dr. Ama Mensah"
                                    placeholderTextColor="#9fb3c8"
                                    autoCapitalize="words"
                                />
                            </View>

                            {/* Faculty */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Faculty / School</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editFaculty}
                                    onChangeText={setEditFaculty}
                                    placeholder="e.g. Information Technology"
                                    placeholderTextColor="#9fb3c8"
                                    autoCapitalize="words"
                                />
                            </View>

                            {/* Department picker */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Department</Text>
                                <View style={styles.optionsRow}>
                                    {[
                                        { v: 'cs',  l: 'Computer Science' },
                                        { v: 'it',  l: 'IT' },
                                        { v: 'mis', l: 'MIS' },
                                    ].map(opt => (
                                        <Pressable
                                            key={opt.v}
                                            onPress={() => setEditDept(opt.v)}
                                            style={({ pressed }) => [styles.optionBtn, editDept === opt.v && styles.optionBtnActive, pressed && { opacity: 0.85 }]}
                                        >
                                            <Text style={[styles.optionBtnText, editDept === opt.v && styles.optionBtnTextActive]}>
                                                {opt.l}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <Pressable
                                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                                onPress={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Save size={18} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.saveBtnText}>Save Changes</Text>
                                    </>
                                )}
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScrollView>
    );
}

function StatCard({ label, value, icon }) {
    return (
        <View style={styles.statCard}>
            <View style={styles.statHeader}>
                <Text style={styles.statLabel}>{label}</Text>
                {icon}
            </View>
            <Text style={styles.statValue}>{value}</Text>
        </View>
    );
}

function InfoItem({ icon, label, value }) {
    return (
        <View style={styles.infoItem}>
            <View style={styles.infoIconWrapper}>{React.cloneElement(icon, { color: '#627d98' })}</View>
            <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );
}

function SettingToggle({ icon, label, value, onValueChange }) {
    return (
        <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
                {React.cloneElement(icon, { color: '#627d98' })}
                <Text style={styles.settingLabel}>{label}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#d9e2ec', true: '#102a43' }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#102a43' : '#f0f4f8'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    scrollArea: { flex: 1 },
    scrollContent: { padding: 40 },
    mobileScrollContent: { padding: 20 },
    profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, backgroundColor: 'white', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#e1e7ec' },
    mobileProfileHeader: { flexDirection: 'column', padding: 24 },
    largeAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#102a43', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#f0f4f8' },
    largeAvatarText: { color: 'white', fontSize: 40, fontWeight: 'bold' },
    headerInfo: { marginLeft: 24, flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    userName: { fontSize: 26, fontWeight: 'bold', color: '#102a43', flex: 1 },
    editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f4f8', borderRadius: 16, gap: 6 },
    editBtnText: { fontSize: 13, fontWeight: 'bold', color: '#486581' },
    userTitle: { fontSize: 16, color: '#627d98', marginBottom: 12 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
    statusDot: { width: 8, height: 8, backgroundColor: '#22c55e', borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 12, fontWeight: 'bold', color: '#102a43' },
    statsRow: { flexDirection: 'row', gap: 20, marginBottom: 40 },
    statCard: { flex: 1, backgroundColor: 'white', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#e1e7ec', maxWidth: 220 },
    statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statLabel: { fontSize: 11, fontWeight: 'bold', color: '#9fb3c8', letterSpacing: 1 },
    statValue: { fontSize: 24, fontWeight: '900', color: '#102a43' },
    mainLayout: { flexDirection: 'row', gap: 32 },
    mobileMainLayout: { flexDirection: 'column' },
    section: { flex: 1 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingLeft: 4 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43', marginLeft: 10 },
    infoCard: { backgroundColor: 'white', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#e1e7ec' },
    infoItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    infoIconWrapper: { width: 40, height: 40, backgroundColor: '#f0f4f8', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    infoLabel: { fontSize: 12, color: '#9fb3c8', marginBottom: 2 },
    infoValue: { fontSize: 15, fontWeight: '600', color: '#102a43' },
    settingsCard: { backgroundColor: 'white', borderRadius: 20, padding: 8, borderWidth: 1, borderColor: '#e1e7ec' },
    settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4f8' },
    lastItem: { borderBottomWidth: 0 },
    settingLabelContainer: { flexDirection: 'row', alignItems: 'center' },
    settingLabel: { fontSize: 15, fontWeight: '600', color: '#486581', marginLeft: 16 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(16,42,67,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4f8' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#102a43' },
    modalClose: { padding: 4 },
    modalScroll: { padding: 24, paddingBottom: 48 },
    avatarPreviewRow: { alignItems: 'center', marginBottom: 28 },
    avatarPreview: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#102a43', justifyContent: 'center', alignItems: 'center' },
    avatarPreviewText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    inputGroup: { marginBottom: 24 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#486581', marginBottom: 8 },
    textInput: { backgroundColor: '#f0f4f8', borderWidth: 1, borderColor: '#e1e7ec', borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: '#102a43' },
    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    optionBtn: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#d9e2ec', borderRadius: 12, flex: 1, minWidth: '28%', alignItems: 'center' },
    optionBtnActive: { backgroundColor: '#102a43', borderColor: '#102a43' },
    optionBtnText: { fontSize: 13, fontWeight: '600', color: '#486581' },
    optionBtnTextActive: { color: 'white' },
    saveBtn: { backgroundColor: '#102a43', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 14, marginTop: 8 },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
