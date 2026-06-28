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
    ActivityIndicator,
    Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GraduationCap, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const router = useRouter();
    const [role, setRole] = useState('student'); // 'student' or 'lecturer'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }
        setLoading(true);
        setError('');
        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        setLoading(false);
        if (authError) {
            setError(authError.message);
            return;
        }
        // Role-tab guard: student on Lecturer tab → reject
        const userRole = data.user?.user_metadata?.role;
        if (role === 'lecturer' && userRole !== 'lecturer') {
            await supabase.auth.signOut();
            setError('Invalid login details.');
            setLoading(false);
            return;
        }
        // Route based on the role stored in user metadata
        if (userRole === 'lecturer') {
            router.replace('/(lecturer)');
        } else {
            router.replace('/(dashboard)');
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
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>
                            {role === 'student'
                                ? 'Sign in to continue your academic journey.'
                                : 'Sign in to manage your courses and students.'}
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
                            <Pressable style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </Pressable>
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <Pressable
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="white" />
                                : <Text style={styles.loginButtonText}>Sign In</Text>
                            }
                        </Pressable>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <Link href="/signup" asChild>
                                <Pressable>
                                    <Text style={styles.footerLink}>Create Account</Text>
                                </Pressable>
                            </Link>
                        </View>

                        <View style={[styles.footer, { marginTop: 12 }]}>
                            <Text style={styles.footerText}>Are you a staff member? </Text>
                            <Link href="/signup-lecturer" asChild>
                                <Pressable>
                                    <Text style={styles.footerLink}>Sign up here</Text>
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    forgotPasswordText: {
        color: '#102a43',
        fontSize: 14,
        fontWeight: '600',
    },
    loginButton: {
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
    loginButtonDisabled: {
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
    loginButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 30,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#d9e2ec',
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#9fb3c8',
        fontWeight: '600',
    },
    idButton: {
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d9e2ec',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    idButtonText: {
        color: '#102a43',
        fontSize: 16,
        fontWeight: '600',
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
