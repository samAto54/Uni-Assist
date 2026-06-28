import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, ArrowLeft, Mail, Lock, User, School, Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';

export default function SignupScreen() {
    const router = useRouter();
    const [role, setRole] = useState('student'); // 'student' or 'lecturer'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [university, setUniversity] = useState('');
    const [department, setDepartment] = useState('cs');
    const [level, setLevel] = useState('100');
    const [staffId, setStaffId] = useState('');
    const [faculty, setFaculty] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async () => {
        if (!name || !email || !password) {
            setError('Please fill in all required fields.');
            return;
        }
        setLoading(true);
        setError('');
        const metadata = {
            full_name: name,
            role,
            university,
            ...(role === 'student' ? { department, level } : { staff_id: staffId, faculty }),
        };
        const { data, error: authError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: metadata },
        });
        setLoading(false);
        if (authError) {
            setError(authError.message);
            return;
        }

        if (role === 'student' && data?.user) {
            const { error: studentError } = await supabase.from('students').insert([{
                id: data.user.id,
                full_name: name,
                email: email.trim(),
                department,
                level,
            }]);
            if (studentError) console.error('Error creating student record:', studentError);
        }

        // Redirect based on chosen role
        if (role === 'lecturer') {
            router.replace('/(lecturer)');
        } else {
            router.replace('/(dashboard)/courses');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
                    >
                        <ArrowLeft size={24} color="#102a43" />
                    </Pressable>

                    <View style={styles.header}>
                        <View style={styles.logoIcon}>
                            <GraduationCap size={40} color="white" />
                        </View>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>
                            {role === 'student'
                                ? 'Join Uni-Assist and smart-charge your studies.'
                                : 'Join Uni-Assist and manage your academic world.'}
                        </Text>
                    </View>

                    {/* Role Switcher */}
                    <View style={styles.roleSwitcher}>
                        <Pressable
                            style={[styles.roleTab, role === 'student' && styles.activeRoleTab]}
                            onPress={() => setRole('student')}
                        >
                            <Text style={[styles.roleTabText, role === 'student' && styles.activeRoleTabText]}>Student</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.roleTab, role === 'lecturer' && styles.activeRoleTab]}
                            onPress={() => setRole('lecturer')}
                        >
                            <Text style={[styles.roleTabText, role === 'lecturer' && styles.activeRoleTabText]}>Lecturer</Text>
                        </Pressable>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <User size={20} color="#9fb3c8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor="#9fb3c8"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color="#9fb3c8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@university.edu"
                                    placeholderTextColor="#9fb3c8"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        {role === 'lecturer' && (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Staff ID</Text>
                                    <View style={styles.inputWrapper}>
                                        <Fingerprint size={20} color="#9fb3c8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="STF-12345"
                                            placeholderTextColor="#9fb3c8"
                                            value={staffId}
                                            onChangeText={setStaffId}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Faculty / Department</Text>
                                    <View style={styles.inputWrapper}>
                                        <School size={20} color="#9fb3c8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Science & Technology"
                                            placeholderTextColor="#9fb3c8"
                                            value={faculty}
                                            onChangeText={setFaculty}
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Department picker — students only */}
                        {role === 'student' && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Department</Text>
                                <View style={styles.courseRow}>
                                    {[
                                        { value: 'cs', label: 'Computer Science' },
                                        { value: 'it', label: 'IT' },
                                        { value: 'mis', label: 'MIS' },
                                    ].map(opt => (
                                        <Pressable
                                            key={opt.value}
                                            style={[styles.courseTab, department === opt.value && styles.activeCourseTab]}
                                            onPress={() => setDepartment(opt.value)}
                                        >
                                            <Text style={[styles.courseTabText, department === opt.value && styles.activeCourseTabText]}>
                                                {opt.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Level picker — students only */}
                        {role === 'student' && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Level</Text>
                                <View style={styles.courseRow}>
                                    {[
                                        { value: '100', label: '100' },
                                        { value: '200', label: '200' },
                                        { value: '300', label: '300' },
                                        { value: '400', label: '400' },
                                    ].map(opt => (
                                        <Pressable
                                            key={opt.value}
                                            style={[styles.courseTab, level === opt.value && styles.activeCourseTab]}
                                            onPress={() => setLevel(opt.value)}
                                        >
                                            <Text style={[styles.courseTabText, level === opt.value && styles.activeCourseTabText]}>
                                                {opt.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>University</Text>
                            <View style={styles.inputWrapper}>
                                <School size={20} color="#9fb3c8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="University Name"
                                    placeholderTextColor="#9fb3c8"
                                    value={university}
                                    onChangeText={setUniversity}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color="#9fb3c8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="#9fb3c8"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <Pressable
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    {showPassword ? (
                                        <EyeOff size={20} color="#9fb3c8" />
                                    ) : (
                                        <Eye size={20} color="#9fb3c8" />
                                    )}
                                </Pressable>
                            </View>
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <Pressable
                            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="white" />
                                : <Text style={styles.signupButtonText}>Create Account</Text>
                            }
                        </Pressable>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <Link href="/login" asChild>
                                <Pressable>
                                    <Text style={styles.footerLink}>Sign In</Text>
                                </Pressable>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 60,
        flexGrow: 1,
        justifyContent: 'center',
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#f0f4f8',
    },
    roleSwitcher: {
        flexDirection: 'row',
        backgroundColor: '#f0f4f8',
        borderRadius: 12,
        padding: 6,
        marginBottom: 30,
    },
    roleTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeRoleTab: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    roleTabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#486581',
    },
    activeRoleTabText: {
        color: '#102a43',
    },
    courseRow: {
        flexDirection: 'row',
        gap: 8,
    },
    courseTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#f0f4f8',
        borderWidth: 1,
        borderColor: '#d9e2ec',
    },
    activeCourseTab: {
        backgroundColor: '#102a43',
        borderColor: '#102a43',
    },
    courseTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#486581',
    },
    activeCourseTabText: {
        color: 'white',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoIcon: {
        backgroundColor: '#102a43',
        padding: 16,
        borderRadius: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#102a43',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#486581',
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#102a43',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#d9e2ec',
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 52,
        fontSize: 16,
        color: '#102a43',
    },
    eyeIcon: {
        padding: 8,
    },
    signupButton: {
        backgroundColor: '#102a43',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#102a43',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    signupButtonDisabled: {
        opacity: 0.7,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8,
        marginBottom: 4,
        textAlign: 'center',
    },
    signupButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
    },
    footerText: {
        color: '#486581',
        fontSize: 15,
    },
    footerLink: {
        color: '#102a43',
        fontSize: 15,
        fontWeight: '700',
    },
});
