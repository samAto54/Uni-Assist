import {
    StyleSheet,
    Text,
    View,
    Pressable,
    ScrollView,
    Dimensions,
    ImageBackground,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import {
    Calendar,
    MapPin,
    Sparkles,
    ArrowRight,
    Fingerprint,
    GraduationCap
} from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

export default function LandingPage() {
    const { continueAsVisitor } = useAuth();
    const router = useRouter();
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoIcon}>
                            <GraduationCap size={24} color="white" />
                        </View>
                        <Text style={styles.logoText}>Uni-Assist</Text>
                    </View>
                    <Link href="/login" asChild>
                        <Pressable style={styles.loginButton}>
                            <Text style={styles.loginButtonText}>Log In</Text>
                        </Pressable>
                    </Link>
                </View>

                {/* Hero Section */}
                <HeroSlideshow 
                    images={[
                        require('../assets/gimpa-hero.jpg'),
                    ]}
                >
                    <View style={styles.heroOverlay}>
                        <Text style={styles.heroSubtitle}>WELCOME TO THE FUTURE OF STUDY</Text>
                        <Text style={styles.heroTitle}>Uni-Assist</Text>
                        <Text style={styles.heroDescription}>
                            Your intelligent campus companion. Designed to help you navigate academic life, schedules, and student resources with ease.
                        </Text>
                        <Link href="/signup" asChild>
                            <Pressable style={styles.getStartedButton}>
                                <Text style={styles.getStartedText}>Get Started</Text>
                                <ArrowRight size={20} color="#102a43" />
                            </Pressable>
                        </Link>
                    </View>
                </HeroSlideshow>

                {/* Features Section */}
                <View style={styles.featuresSection}>
                    <Text style={styles.featuresTitle}>Everything you need in one place</Text>
                    <Text style={styles.featuresSubtitle}>
                        Stop switching between dozens of apps. Uni-Assist integrates your university experience into a single, smart interface.
                    </Text>

                    <View style={styles.featureCardsContainer}>
                        <FeatureCard
                            icon={<Calendar size={24} color="#486581" />}
                            title="Smart Scheduling"
                            description="Sync your lecture times, exam dates, and social events automatically. Get personalized reminders before every class."
                        />
                        <FeatureCard
                            icon={<MapPin size={24} color="#486581" />}
                            title="Campus Navigation"
                            description="Lost in building C? Our AI guides you through hallways and helps you find the nearest quiet study spot or cafe."
                        />
                        <FeatureCard
                            icon={<Sparkles size={24} color="#486581" />}
                            title="Academic Support"
                            description="Ask anything about campus policies, library hours, or enrollment deadlines. Instant answers for every student query."
                        />
                    </View>
                </View>

                {/* Auth Section */}
                <View style={styles.authSection}>
                    <Link href="/signup" asChild>
                        <Pressable style={styles.createAccountButton}>
                            <Text style={styles.createAccountText}>Create Student Account</Text>
                        </Pressable>
                    </Link>


                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <Pressable 
                        style={styles.visitorButton} 
                        onPress={() => {
                            continueAsVisitor();
                            router.push('/(dashboard)');
                        }}
                    >
                        <Text style={styles.visitorButtonText}>Continue as Visitor</Text>
                    </Pressable>

                    <Text style={styles.tosText}>
                        By joining, you agree to our <Text style={styles.tosLink}>Terms of Service</Text>.
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLinks}>
                        <Pressable onPress={() => alert("Privacy Policy coming soon")}>
                            <Text style={styles.footerLink}>Privacy Policy</Text>
                        </Pressable>
                        <Pressable onPress={() => alert("Support: 0257553067 or sammichael724@gmail.com")}>
                            <Text style={styles.footerLink}>Contact Support</Text>
                        </Pressable>
                    </View>
                    <Text style={styles.copyrightText}>
                        © 2026 Michael Sam. All Rights Reserved.
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

function HeroSlideshow({ images, children }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [imageError, setImageError] = useState(false);
    const opacity = useSharedValue(1);

    useEffect(() => {
        const interval = setInterval(() => {
            opacity.value = withTiming(0.5, { duration: 1000 }, (finished) => {
                if (finished) {
                    runOnJS(setCurrentIndex)((prev) => (prev + 1) % images.length);
                    opacity.value = withTiming(1, { duration: 1000 });
                }
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [images.length, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <View style={styles.heroWrapper}>
            <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                {imageError ? (
                    <View style={[styles.heroImage, styles.heroFallback]}>
                        {children}
                    </View>
                ) : (
                    <ImageBackground
                        source={images[currentIndex]}
                        style={styles.heroImage}
                        imageStyle={{ borderRadius: 20, resizeMode: 'cover' }}
                        onError={() => setImageError(true)}
                    >
                        {children}
                    </ImageBackground>
                )}
            </Animated.View>
        </View>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <View style={styles.card}>
            <View style={styles.cardIconContainer}>
                {icon}
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDescription}>{description}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: isMobile ? 20 : 60,
        paddingVertical: 20,
        backgroundColor: 'white',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoIcon: {
        backgroundColor: '#102a43',
        padding: 8,
        borderRadius: 8,
        marginRight: 10,
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#102a43',
    },
    loginButton: {
        borderWidth: 1,
        borderColor: '#bcccdc',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    loginButtonText: {
        color: '#102a43',
        fontWeight: '600',
    },
    heroWrapper: {
        paddingHorizontal: isMobile ? 10 : 60,
        marginTop: 20,
        height: isMobile ? 350 : 750, // Fixed height for slideshow
    },
    heroImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: '#102a43',
    },
    heroFallback: {
        backgroundColor: '#102a43',
    },
    heroOverlay: {
        flex: 1,
        backgroundColor: 'rgba(16, 42, 67, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        borderRadius: 20,
    },
    heroSubtitle: {
        color: '#9fb3c8',
        fontSize: 14,
        letterSpacing: 2,
        fontWeight: '600',
        marginBottom: 10,
    },
    heroTitle: {
        color: 'white',
        fontSize: isMobile ? 48 : 72,
        fontWeight: '800',
        marginBottom: 20,
    },
    heroDescription: {
        color: '#d9e2ec',
        fontSize: 18,
        textAlign: 'center',
        maxWidth: 600,
        lineHeight: 26,
        marginBottom: 40,
    },
    getStartedButton: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 12,
    },
    getStartedText: {
        color: '#102a43',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 10,
    },
    featuresSection: {
        paddingHorizontal: isMobile ? 20 : 60,
        paddingVertical: 80,
        alignItems: 'center',
    },
    featuresTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#102a43',
        marginBottom: 15,
        textAlign: 'center',
    },
    featuresSubtitle: {
        fontSize: 18,
        color: '#486581',
        textAlign: 'center',
        maxWidth: 800,
        lineHeight: 28,
        marginBottom: 50,
    },
    featureCardsContainer: {
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 20,
    },
    card: {
        flex: 1,
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardIconContainer: {
        backgroundColor: '#f0f4f8',
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#102a43',
        marginBottom: 10,
    },
    cardDescription: {
        fontSize: 16,
        color: '#486581',
        lineHeight: 24,
    },
    authSection: {
        paddingHorizontal: 20,
        paddingVertical: 60,
        alignItems: 'center',
    },
    createAccountButton: {
        backgroundColor: '#001a33',
        width: isMobile ? '100%' : 400,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 15,
    },
    createAccountText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    signInIdButton: {
        backgroundColor: '#e1e7ec',
        width: isMobile ? '100%' : 400,
        flexDirection: 'row',
        paddingVertical: 18,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    signInIdText: {
        color: '#102a43',
        fontSize: 18,
        fontWeight: '600',
    },
    tosText: {
        color: '#627d98',
        fontSize: 14,
    },
    tosLink: {
        textDecorationLine: 'underline',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#f0f4f8',
        paddingVertical: 60,
        alignItems: 'center',
        marginTop: 40,
    },
    footerLinks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 30,
        marginBottom: 30,
    },
    footerLink: {
        color: '#486581',
        fontSize: 14,
        fontWeight: '500',
    },
    copyrightText: {
        color: '#9fb3c8',
        fontSize: 14,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        width: isMobile ? '100%' : 400,
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e1e7ec',
    },
    dividerText: {
        marginHorizontal: 15,
        color: '#9fb3c8',
        fontWeight: '600',
        fontSize: 12,
    },
    visitorButton: {
        backgroundColor: 'white',
        width: isMobile ? '100%' : 400,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#102a43',
    },
    visitorButtonText: {
        color: '#102a43',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
