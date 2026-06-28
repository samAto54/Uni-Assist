import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    StyleSheet,
    View,
    Pressable,
    Text,
    TextInput,
    useWindowDimensions,
    ActivityIndicator,
    ScrollView,
    PanResponder,
    Modal,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Image } from 'expo-image';
import {
    LayoutDashboard,
    MessageSquare,
    Megaphone,
    User,
    Search,
    Bell,
    Menu,
    GraduationCap,
    LogOut,
    X,
    BookOpen,
    Navigation as NavIcon,
    Clock
} from 'lucide-react-native';
import { Slot, useRouter, usePathname, Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function LecturerLayout() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isMobile = width < 768;
    const { session, user, loading } = useAuth();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [reminders, setReminders] = useState([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    // Sidebar animated state (Reanimated)
    const sidebarX = useSharedValue(-260);

    const openMenu = useCallback(() => {
        setMenuOpen(true);
        // Pop-out without overshoot
        sidebarX.value = withTiming(0, { duration: 180 });
    }, [sidebarX]);

    const closeMenu = useCallback(() => {
        sidebarX.value = withTiming(-260, { duration: 220 }, () => runOnJS(setMenuOpen)(false));
    }, [sidebarX]);

    // Use PanResponder to handle swipe gestures reliably without
    // requiring reanimated gesture helpers which may not be present.
    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_evt, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 50,
            onPanResponderMove: (_evt, gs) => {
                if (!menuOpen && gs.moveX < 80 && gs.dx > 0) {
                    const newX = Math.min(0, -260 + gs.dx);
                    sidebarX.value = newX;
                }
                if (menuOpen && gs.dx < 0) {
                    const newX = Math.max(-260, gs.dx);
                    sidebarX.value = newX;
                }
            },
            onPanResponderRelease: (_evt, gs) => {
                if (!menuOpen) {
                    if (gs.dx > 60) openMenu(); else closeMenu();
                } else {
                    if (gs.dx < -60) closeMenu(); else openMenu();
                }
            }
        })
    ).current;

    const mobileSidebarStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sidebarX.value }] }));

    const pathname = usePathname();
    useEffect(() => { closeMenu(); }, [pathname, closeMenu]);

    // Fetch upcoming classes for lecturers
    useEffect(() => {
        const fetchReminders = async () => {
            if (!user) return;

            const assignedCodes = Array.isArray(user?.user_metadata?.course_codes)
                ? user.user_metadata.course_codes
                : null;

            if (!assignedCodes || assignedCodes.length === 0) return;

            try {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayName = days[new Date().getDay()];

                const { data: courses } = await supabase
                    .from('courses')
                    .select('code, name')
                    .in('code', assignedCodes);

                if (!courses || courses.length === 0) return;

                const courseNames = courses.reduce((acc, c) => ({...acc, [c.code]: c.name}), {});

                const { data: sessions } = await supabase
                    .from('course_sessions')
                    .select('*')
                    .eq('day', todayName)
                    .in('course_code', assignedCodes);

                if (!sessions) return;

                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();

                const parseTime = (timeStr) => {
                    const [time, modifier] = timeStr.split(' ');
                    let [hours, minutes] = time.split(':');
                    let h = parseInt(hours, 10);
                    if (h === 12) h = 0;
                    if (modifier === 'PM') h += 12;
                    return h * 60 + parseInt(minutes, 10);
                };

                const upcoming = sessions.map(s => ({
                    ...s,
                    courseName: courseNames[s.course_code],
                    minutes: parseTime(s.time_slot)
                })).filter(s => s.minutes > currentMinutes)
                   .sort((a, b) => a.minutes - b.minutes);

                setReminders(upcoming);
            } catch (e) {
                console.error('[Lecturer Layout] fetchReminders:', e.message);
            }
        };

        const interval = setInterval(fetchReminders, 60000);
        fetchReminders();

        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (!loading && !session) { router.replace('/login'); return; }
        if (!loading && session && user?.user_metadata?.role !== 'lecturer') {
            router.replace('/(dashboard)');
        }
    }, [session, user, loading, router]);

    if (loading || !session) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentWrapper}>
                {isDesktop && <Sidebar />}

                {/* Swipe-to-open sidebar for mobile — animated, no Modal */}
                {isMobile && (
                    <>
                        {/* Backdrop — only visible when open */}
                        {menuOpen && (
                            <Pressable
                                style={styles.modalBackground}
                                onPress={closeMenu}
                            />
                        )}
                        {/* Animated sidebar panel */}
                        <Animated.View style={[styles.mobileSidebarContainer, mobileSidebarStyle]}>
                            <Sidebar onClose={closeMenu} />
                        </Animated.View>
                    </>
                )}

                {/* Main content — pan responder lives here to catch swipes */}
                <View style={styles.mainContainer} {...(isMobile ? panResponder.panHandlers : {})}>
                    <Header
                        isMobile={isMobile}
                        onMenuPress={openMenu}
                        reminders={reminders}
                    />
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: '#f8fafc' },
                            gestureEnabled: true,
                            animation: 'slide_from_right',
                        }}
                    >
                        <Stack.Screen name="index"         options={{ gestureEnabled: false }} />
                        <Stack.Screen name="classes"       options={{ gestureEnabled: false }} />
                        <Stack.Screen name="chat"          options={{ gestureEnabled: true }} />
                        <Stack.Screen name="navigation"    options={{ gestureEnabled: false }} />
                        <Stack.Screen name="inquiries"     options={{ gestureEnabled: false }} />
                        <Stack.Screen name="announcements" options={{ gestureEnabled: false }} />
                        <Stack.Screen name="profile"       options={{ gestureEnabled: false }} />
                    </Stack>
                </View>
            </View>
        </SafeAreaView>
    );
}

function Sidebar({ onClose }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuth();

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard',     href: '/(lecturer)' },
        { icon: <BookOpen size={20} />,        label: 'Courses',        href: '/(lecturer)/classes' },
        { icon: <MessageSquare size={20} />,   label: 'AI Assistant',   href: '/(lecturer)/chat' },
        { icon: <NavIcon size={20} />,         label: 'Navigation',     href: '/(lecturer)/navigation' },
        { icon: <MessageSquare size={20} />,   label: 'Inquiries',      href: '/(lecturer)/inquiries' },
        { icon: <Megaphone size={20} />,       label: 'Announcements',  href: '/(lecturer)/announcements' },
        { icon: <User size={20} />,            label: 'Profile',        href: '/(lecturer)/profile' },
    ];

    const handleSignOut = async () => {
        await signOut();
        router.replace('/login');
    };

    const handleNav = (href) => {
        router.push(href);
        if (onClose) onClose();
    };

    return (
        <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
                <View style={styles.sidebarLogoIcon}>
                    <GraduationCap size={24} color="white" />
                </View>
                <Text style={styles.sidebarLogoText}>Uni-Assist</Text>
            </View>

            <View style={styles.navMenu}>
                <Text style={styles.menuLabel}>LECTURER PORTAL</Text>
                {navItems.map((item) => (
                    <Pressable
                        key={item.href}
                        style={[styles.navItem, pathname === item.href && styles.activeNavItem]}
                        onPress={() => handleNav(item.href)}
                    >
                        {React.cloneElement(item.icon, { color: pathname === item.href ? 'white' : '#486581' })}
                        <Text style={[styles.navItemLabel, pathname === item.href && styles.activeNavItemLabel]}>
                            {item.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.sidebarFooter}>
                <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                    <LogOut size={18} color="#486581" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </Pressable>
            </View>
        </View>
    );
}

function Header({ isMobile, onMenuPress, reminders }) {
    const router = useRouter();
    const { user } = useAuth();
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const displayName = user?.user_metadata?.full_name || user?.email || 'Lecturer';
    const displayRole = user?.user_metadata?.faculty || 'Faculty Member';

    return (
        <View style={[styles.header, isMobile && styles.mobileHeader]}>
            <View style={styles.headerLeft}>
                {isMobile && (
                    <Pressable style={styles.menuBtn} onPress={onMenuPress}>
                        <Menu size={24} color="#102a43" />
                    </Pressable>
                )}
                <View style={[styles.searchContainer, isMobile && styles.mobileSearchContainer]}>
                    <Search size={18} color="#9fb3c8" style={styles.searchIcon} />
                    <TextInput
                        placeholder={isMobile ? "Search..." : "Search students, classes, or files..."}
                        placeholderTextColor="#9fb3c8"
                        style={styles.searchInput}
                    />
                </View>
            </View>

            <View style={styles.headerRight}>
                <Pressable style={styles.iconBtn} onPress={() => setIsNotifOpen(true)}>
                    <Bell size={22} color="#102a43" />
                    {reminders.length > 0 && <View style={styles.notifBadge} />}
                </Pressable>

                {/* Notifications Modal */}
                <Modal visible={isNotifOpen} transparent={true} animationType="fade" onRequestClose={() => setIsNotifOpen(false)}>
                    <Pressable style={styles.modalOverlay} onPress={() => setIsNotifOpen(false)}>
                        <View style={styles.notifDropdown}>
                            <View style={styles.notifHeader}>
                                <Text style={styles.notifTitle}>Upcoming Classes Today</Text>
                                <Pressable onPress={() => setIsNotifOpen(false)}>
                                    <X size={20} color="#627d98" />
                                </Pressable>
                            </View>

                            <ScrollView style={styles.notifList}>
                                {reminders.length === 0 ? (
                                    <View style={styles.emptyNotif}>
                                        <Text style={styles.emptyNotifText}>No more classes for today!</Text>
                                    </View>
                                ) : (
                                    reminders.map((notif) => (
                                        <View key={`${notif.course_code}-${notif.time_slot}`} style={styles.notifItem}>
                                            <View style={styles.notifIconBox}>
                                                <Clock size={16} color="#3b82f6" />
                                            </View>
                                            <View style={styles.notifContent}>
                                                <Text style={styles.notifCourse}>{notif.courseName}</Text>
                                                <Text style={styles.notifTime}>{notif.time_slot} • {notif.location}</Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>

                            <Pressable 
                                style={styles.viewFullSchedule} 
                                onPress={() => {
                                    setIsNotifOpen(false);
                                    router.push('/(lecturer)/classes');
                                }}
                            >
                                <Text style={styles.viewFullScheduleText}>View Full Schedule</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Modal>

                <Pressable style={styles.profileBtn} onPress={() => router.push('/(lecturer)/profile')}>
                    {!isMobile && (
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{displayName}</Text>
                            <Text style={styles.profileRole}>{displayRole}</Text>
                        </View>
                    )}
                    <View style={styles.profileAvatar}>
                        {user?.user_metadata?.avatar_url ? (
                            <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.profileAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                        )}
                    </View>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    contentWrapper: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: 260,
        height: '100%',
        backgroundColor: 'white',
        borderRightWidth: 1,
        borderRightColor: '#e1e7ec',
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 48 : 24,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        justifyContent: 'space-between',
    },
    sidebarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
    },
    sidebarLogoIcon: {
        backgroundColor: '#001a33',
        padding: 8,
        borderRadius: 8,
        marginRight: 10,
    },
    sidebarLogoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#001a33',
    },
    menuLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#9fb3c8',
        letterSpacing: 1.5,
        marginBottom: 16,
        paddingLeft: 16,
    },
    navMenu: {
        flex: 1,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    activeNavItem: {
        backgroundColor: '#001a33',
    },
    navItemLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#486581',
        marginLeft: 16,
    },
    activeNavItemLabel: {
        color: 'white',
    },
    sidebarFooter: {},
    mainContainer: {
        flex: 1,
    },
    header: {
        height: 80,
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e7ec',
        zIndex: 10,
    },
    mobileHeader: {
        paddingHorizontal: 20,
        height: 64,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuBtn: {
        marginRight: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        borderRadius: 12,
        width: 400,
        paddingHorizontal: 16,
        height: 48,
    },
    mobileSearchContainer: {
        width: 'auto',
        flex: 1,
        marginRight: 12,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#102a43',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBtn: {
        marginRight: 24,
    },
    profileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileInfo: {
        alignItems: 'flex-end',
        marginRight: 12,
    },
    profileName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#102a43',
    },
    profileRole: {
        fontSize: 13,
        color: '#627d98',
    },
    profileAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#102a43',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileAvatarText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 10,
    },
    signOutText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#486581',
    },
    modalBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 40,
    },
    mobileSidebarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 260,
        backgroundColor: 'white',
        zIndex: 50,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 20,
    },
    notifBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: 'white',
    },
    notifDropdown: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 70 : 80,
        right: Platform.OS === 'web' ? 40 : 20,
        width: 320,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#102a43',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#e1e7ec',
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    notifTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#102a43',
    },
    notifList: {
        maxHeight: 300,
    },
    notifItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f4f8',
    },
    notifIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notifContent: {
        flex: 1,
    },
    notifCourse: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#102a43',
        marginBottom: 2,
    },
    notifTime: {
        fontSize: 12,
        color: '#627d98',
    },
    emptyNotif: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyNotifText: {
        color: '#9fb3c8',
        fontSize: 14,
    },
    viewFullSchedule: {
        marginTop: 16,
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f4f8',
    },
    viewFullScheduleText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 40,
    },
});
