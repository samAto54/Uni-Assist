import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Pressable,
    Image,
    Switch,
    useWindowDimensions,
    Platform,
    Modal,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Alert
} from 'react-native';
import {
    User,
    Mail,
    Book,
    Hash,
    Settings,
    Bell,
    Shield,
    Lock,
    LogOut,
    ChevronRight,
    TrendingUp,
    Award,
    Clock,
    Edit,
    X,
    Save,
    Camera
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const router = useRouter();
    const { user, signOut, isVisitor } = useAuth();

    const [notifications, setNotifications] = useState(true);
    const [biometrics, setBiometrics] = useState(false);
    const [studentProfile, setStudentProfile] = useState(null);

    useEffect(() => {
        if (isVisitor) {
            router.replace('/(dashboard)');
            return;
        }
        const fetchProfile = async () => {
            if (!user) return;
            // First check if lecturer
            if (user.user_metadata?.role === 'lecturer') {
                return; // We handle student mainly here, lecturer has different view
            }
            const { data } = await supabase.from('students').select('*').eq('id', user.id).single();
            if (data) setStudentProfile(data);
        };
        fetchProfile();
    }, [user, isVisitor, router]);

    const handleSignOut = async () => {
        await signOut();
        router.replace('/login');
    };

    const fullName = studentProfile?.full_name || user?.user_metadata?.full_name || 'Loading...';
    const rawDept = studentProfile?.department || user?.user_metadata?.department || user?.user_metadata?.course;
    const departmentName = rawDept === 'cs' ? 'Computer Science' : 
                           rawDept === 'it' ? 'Information Technology' : 
                           rawDept === 'mis' ? 'Management Information Systems' : 'Loading...';
    
    const levelNum = studentProfile?.level || user?.user_metadata?.level || '100';
    const yearOfStudy = levelNum === '100' ? 'Freshman (Year 1)' :
                        levelNum === '200' ? 'Sophomore (Year 2)' :
                        levelNum === '300' ? 'Junior (Year 3)' :
                        levelNum === '400' ? 'Senior (Year 4)' : `Level ${levelNum}`;
                        
    const major = rawDept ? `B.Sc. ${departmentName}` : 'Loading...';
    const email = studentProfile?.email || user?.email || 'Loading...';

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editIndexNumber, setEditIndexNumber] = useState('');
    const [editDept, setEditDept] = useState('');
    const [editLevel, setEditLevel] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const pickImage = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setEditAvatarUrl(result.assets[0].uri);
        }
    };

    const handleOpenEdit = () => {
        setEditName(fullName !== 'Loading...' ? fullName : '');
        setEditIndexNumber(studentProfile?.index_number || user?.user_metadata?.index_number || '');
        setEditDept(rawDept && ['cs', 'it', 'mis'].includes(rawDept) ? rawDept : '');
        setEditLevel(levelNum || '');
        setEditAvatarUrl(user?.user_metadata?.avatar_url || '');
        setIsEditing(true);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) return;
        setIsSaving(true);
        try {
            // 1. Update Auth Metadata
            const { error: metaError } = await supabase.auth.updateUser({
                data: {
                    full_name: editName.trim(),
                    department: editDept,
                    level: editLevel,
                    avatar_url: editAvatarUrl,
                    index_number: editIndexNumber.trim(),
                }
            });

            if (metaError) {
                Alert.alert('Error Saving', 'Failed to update account: ' + metaError.message);
                return;
            }

            // 2. Sync to students table (best-effort — may fail due to RLS)
            const { data, error: dbError } = await supabase.from('students').upsert({
                id: user.id,
                full_name: editName.trim(),
                email: user.email,
                department: editDept,
                level: editLevel,
                index_number: editIndexNumber.trim(),
            }).select();

            if (dbError) {
                console.warn('[Profile] DB sync failed:', dbError.message);
            }

            // Update local state
            setStudentProfile(
                data && data.length > 0
                    ? data[0]
                    : { full_name: editName.trim(), department: editDept, level: editLevel, index_number: editIndexNumber.trim() }
            );
            setIsEditing(false);
        } catch (e) {
            console.error('[Profile] save error:', e.message);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const avatarUrl = user?.user_metadata?.avatar_url;

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
        >
            {/* Profile Header */}
            <View style={[styles.profileHeader, isMobile && styles.mobileProfileHeader]}>
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.largeAvatar} />
                ) : (
                    <View style={styles.fallbackAvatar}>
                        <Text style={styles.fallbackAvatarText}>{(fullName !== 'Loading...' && fullName.length > 0) ? fullName.charAt(0).toUpperCase() : 'U'}</Text>
                    </View>
                )}
                <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.userName}>{fullName}</Text>
                        <Pressable style={styles.editBtn} onPress={handleOpenEdit}>
                            <Edit size={16} color="#486581" />
                            <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                    </View>
                    <Text style={styles.userMajor}>{major}</Text>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Active Student</Text>
                    </View>
                </View>
            </View>

            <View style={[styles.mainLayout, isMobile && styles.mobileMainLayout]}>
                {/* Account Info */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <User size={20} color="#102a43" />
                        <Text style={styles.sectionTitle}>Account Information</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <InfoItem icon={<Hash size={18} />} label="Student ID" value={user?.id?.substring(0, 8).toUpperCase() || 'N/A'} />
                        <InfoItem icon={<Hash size={18} />} label="Index Number" value={studentProfile?.index_number || user?.user_metadata?.index_number || 'N/A'} />
                        <InfoItem icon={<Mail size={18} />} label="Email Address" value={email} />
                        <InfoItem icon={<Book size={18} />} label="Department" value={departmentName} />
                        <InfoItem icon={<Clock size={18} />} label="Year of Study" value={yearOfStudy} />
                    </View>
                </View>

                {/* App Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Settings size={20} color="#102a43" />
                        <Text style={styles.sectionTitle}>Preferences</Text>
                    </View>
                    <View style={styles.settingsCard}>
                        <SettingToggle
                            icon={<Bell size={18} />}
                            label="Push Notifications"
                            value={notifications}
                            onValueChange={setNotifications}
                        />
                        <SettingToggle
                            icon={<Shield size={18} />}
                            label="Biometric Login"
                            value={biometrics}
                            onValueChange={setBiometrics}
                        />
                        <Pressable style={styles.settingItem}>
                            <View style={styles.settingLabelContainer}>
                                <Lock size={18} color="#627d98" />
                                <Text style={styles.settingLabel}>Change Password</Text>
                            </View>
                            <ChevronRight size={18} color="#cbd5e0" />
                        </Pressable>
                        <Pressable
                            style={[styles.settingItem, styles.lastItem]}
                            onPress={handleSignOut}
                        >
                            <View style={styles.settingLabelContainer}>
                                <LogOut size={18} color="#ef4444" />
                                <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Sign Out</Text>
                            </View>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Edit Profile Modal */}
            <Modal visible={isEditing} animationType="slide" transparent={true} onRequestClose={() => setIsEditing(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <Pressable onPress={() => setIsEditing(false)} style={styles.closeBtn}>
                                <X size={24} color="#627d98" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                            {/* Profile Image Picker */}
                            <View style={styles.imagePickerContainer}>
                                {editAvatarUrl ? (
                                    <Image source={{ uri: editAvatarUrl }} style={styles.editAvatarPreview} />
                                ) : (
                                    <View style={[styles.editAvatarPreview, styles.fallbackAvatarPreview]}>
                                        <Text style={styles.fallbackAvatarText}>
                                            {editName ? editName.charAt(0).toUpperCase() : 'U'}
                                        </Text>
                                    </View>
                                )}
                                <Pressable style={styles.changePhotoBtn} onPress={pickImage}>
                                    <Camera size={16} color="white" />
                                    <Text style={styles.changePhotoBtnText}>Change Photo</Text>
                                </Pressable>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="John Doe"
                                    placeholderTextColor="#9fb3c8"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Index Number</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editIndexNumber}
                                    onChangeText={setEditIndexNumber}
                                    placeholder="10023456"
                                    placeholderTextColor="#9fb3c8"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Profile Image URL (Optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editAvatarUrl}
                                    onChangeText={setEditAvatarUrl}
                                    placeholder="https://example.com/my-photo.jpg"
                                    placeholderTextColor="#9fb3c8"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Department</Text>
                                <View style={styles.optionsRow}>
                                    {[ {v: 'cs', l: 'Computer Science'}, {v: 'it', l: 'IT'}, {v: 'mis', l: 'MIS'} ].map(opt => (
                                        <Pressable
                                            key={opt.v}
                                            style={[styles.optionBtn, editDept === opt.v && styles.optionBtnActive]}
                                            onPress={() => setEditDept(opt.v)}
                                        >
                                            <Text style={[styles.optionBtnText, editDept === opt.v && styles.optionBtnTextActive]}>{opt.l}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Level (Year)</Text>
                                <View style={styles.optionsRow}>
                                    {['100', '200', '300', '400'].map(lvl => (
                                        <Pressable
                                            key={lvl}
                                            style={[styles.optionBtn, editLevel === lvl && styles.optionBtnActive]}
                                            onPress={() => setEditLevel(lvl)}
                                        >
                                            <Text style={[styles.optionBtnText, editLevel === lvl && styles.optionBtnTextActive]}>{lvl}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <Pressable
                                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                                onPress={handleSaveProfile}
                                disabled={isSaving}
                            >
                                {isSaving ? <ActivityIndicator color="white" /> : (
                                        <>
                                            <Save size={20} color="white" style={{ marginRight: 8 }} />
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
            <View>
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
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        backgroundColor: 'white',
        padding: 32,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e1e7ec',
    },
    mobileProfileHeader: {
        flexDirection: 'column',
        textAlign: 'center',
        padding: 24,
    },
    largeAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#f0f4f8',
    },
    fallbackAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#102a43',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#f0f4f8',
    },
    fallbackAvatarText: {
        color: 'white',
        fontSize: 40,
        fontWeight: 'bold',
    },
    headerInfo: {
        marginLeft: 24,
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#102a43',
        flex: 1,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f0f4f8',
        borderRadius: 16,
    },
    editBtnText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#486581',
        marginLeft: 6,
    },
    userMajor: {
        fontSize: 16,
        color: '#627d98',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 8,
        height: 8,
        backgroundColor: '#22c55e',
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#102a43',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 40,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e1e7ec',
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#9fb3c8',
        letterSpacing: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#102a43',
    },
    mainLayout: {
        flexDirection: 'row',
        gap: 32,
    },
    mobileMainLayout: {
        flexDirection: 'column',
    },
    section: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingLeft: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#102a43',
        marginLeft: 10,
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e1e7ec',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    infoIconWrapper: {
        width: 40,
        height: 40,
        backgroundColor: '#f0f4f8',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoLabel: {
        fontSize: 12,
        color: '#9fb3c8',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#102a43',
    },
    settingsCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 8,
        borderWidth: 1,
        borderColor: '#e1e7ec',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f4f8',
    },
    lastItem: {
        borderBottomWidth: 0,
    },
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#486581',
        marginLeft: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(16, 42, 67, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#102a43',
    },
    closeBtn: {
        padding: 4,
    },
    modalScroll: {
        padding: 24,
        paddingTop: 8,
    },
    imagePickerContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    editAvatarPreview: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 16,
        borderWidth: 4,
        borderColor: '#f0f4f8',
    },
    fallbackAvatarPreview: {
        backgroundColor: '#102a43',
        justifyContent: 'center',
        alignItems: 'center',
    },
    changePhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#102a43',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#102a43',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    changePhotoBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#486581',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#f0f4f8',
        borderWidth: 1,
        borderColor: '#e1e7ec',
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#102a43',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d9e2ec',
        borderRadius: 12,
        flex: 1,
        minWidth: '25%',
        alignItems: 'center',
    },
    optionBtnActive: {
        backgroundColor: '#102a43',
        borderColor: '#102a43',
    },
    optionBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#486581',
    },
    optionBtnTextActive: {
        color: 'white',
    },
    saveBtn: {
        backgroundColor: '#102a43',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 14,
        marginTop: 12,
        marginBottom: 40,
    },
    saveBtnDisabled: {
        opacity: 0.7,
    },
    saveBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
