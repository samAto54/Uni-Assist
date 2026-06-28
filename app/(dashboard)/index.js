import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Pressable,
    useWindowDimensions,
    ActivityIndicator
} from 'react-native';
import {
    MessageSquare,
    MapPin,
    Megaphone,
    LayoutGrid,
    Library,
    Utensils,
    Star,
    Navigation as NavIcon
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function DashboardHome() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const router = useRouter();
    const { user, isVisitor } = useAuth();
    const fullName = isVisitor ? 'Visitor' : (user?.user_metadata?.full_name || user?.email || 'Student');
    const firstName = fullName.split(' ')[0];
    const today = new Date();
    const hour = today.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    
    const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', dateOptions);

    // --- Live data state ---
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [recentChat, setRecentChat] = useState(null);
    const [newsItems, setNewsItems] = useState([]);
    const [newsLoading, setNewsLoading] = useState(true);

    // Fetch today's schedule
    useEffect(() => {
        const fetchTodaySchedule = async () => {
            if (!user || isVisitor) {
                setScheduleLoading(false);
                return;
            }
            setScheduleLoading(true);

            // Get student info
            const { data: student } = await supabase
                .from('students')
                .select('department, level')
                .eq('id', user.id)
                .single();

            let activeStudent = student || {};
            const metadata = user.user_metadata || {};

            if (!activeStudent.department || !activeStudent.level) {
                activeStudent = {
                    department: activeStudent.department || metadata.department || metadata.course || 'cs',
                    level: activeStudent.level || metadata.level || '100'
                };
            }

            const dept = activeStudent.department;
            const level = activeStudent.level;

            // Get courses for this student
            const { data: courses } = await supabase
                .from('courses')
                .select('code, name')
                .eq('department', dept.trim())
                .eq('level', level.toString().trim());

            if (!courses || courses.length === 0) {
                setScheduleLoading(false);
                return;
            }

            const courseCodes = courses.map(c => c.code);
            const courseNames = courses.reduce((acc, c) => ({ ...acc, [c.code]: c.name }), {});

            // Get today's sessions
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayName = days[new Date().getDay()];

            const { data: sessions } = await supabase
                .from('course_sessions')
                .select('*')
                .eq('day', todayName)
                .in('course_code', courseCodes);

            if (sessions && sessions.length > 0) {
                const uniqueSessions = [];
                sessions.forEach(s => {
                    const isDup = uniqueSessions.some(us => us.time_slot === s.time_slot && us.course_code === s.course_code && us.location === s.location);
                    if (!isDup) uniqueSessions.push(s);
                });

                // Parse and sort by time
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

                const formatted = uniqueSessions.map(s => {
                    const totalMinutes = parseTime(s.time_slot);
                    const isPast = totalMinutes + 60 < currentMinutes; // assume ~1hr class
                    const isCurrent = totalMinutes <= currentMinutes && totalMinutes + 60 >= currentMinutes;
                    const [timePart, period] = s.time_slot.split(' ');
                    return {
                        time: timePart,
                        period: period || '',
                        course: `${s.course_code}: ${courseNames[s.course_code]}`,
                        location: s.location,
                        active: isCurrent,
                        disabled: isPast,
                        minutes: totalMinutes,
                    };
                }).sort((a, b) => a.minutes - b.minutes);

                setTodaySchedule(formatted);
            }
            setScheduleLoading(false);
        };

        fetchTodaySchedule();
    }, [user, isVisitor]);

    // Fetch recent chat message
    useEffect(() => {
        const fetchRecentChat = async () => {
            if (!user || isVisitor) return;
            const { data } = await supabase
                .from('chat_messages')
                .select('content')
                .eq('user_id', user.id)
                .eq('sender', 'user')
                .order('created_at', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                setRecentChat(data[0].content);
            }
        };
        fetchRecentChat();
    }, [user, isVisitor]);

    // Fetch campus news
    useEffect(() => {
        const fetchNews = async () => {
            setNewsLoading(true);
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(2);

            if (!error && data) {
                setNewsItems(data);
            }
            setNewsLoading(false);
        };
        fetchNews();
    }, []);

    // Format relative time
    const getRelativeTime = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    };

    const recentChatDisplay = recentChat
        ? `"${recentChat.length > 80 ? recentChat.substring(0, 80) + '...' : recentChat}"`
        : '"Ask Uni-Assist anything about GIMPA..."';

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.welcomeSection}>
                <Text style={[styles.greetingText, isMobile && styles.mobileGreetingText]}>{greeting}, {firstName}!</Text>
                <Text style={styles.dateText}>{formattedDate}</Text>
            </View>

            <View style={[styles.gridContainer, isMobile && styles.mobileGridContainer]}>
                <View style={styles.leftColumn}>
                    <SectionHeader
                        title="Today's Schedule"
                        action={isVisitor ? null : "View Full Calendar"}
                        onActionPress={isVisitor ? undefined : () => router.push('/(dashboard)/timetable')}
                    />
                    
                    {scheduleLoading ? (
                        <ActivityIndicator size="small" color="#102a43" style={{ marginVertical: 20 }} />
                    ) : todaySchedule.length > 0 ? (
                        todaySchedule.map((item, idx) => (
                            <ScheduleItem
                                key={idx}
                                time={item.time}
                                period={item.period}
                                course={item.course}
                                location={item.location}
                                active={item.active}
                                disabled={item.disabled}
                            />
                        ))
                    ) : (
                        <View style={styles.emptySchedule}>
                            <Text style={styles.emptyScheduleText}>
                                {isVisitor 
                                    ? "Sign in to see your personalized class schedule." 
                                    : "No classes scheduled, or profile incomplete. Please update your profile."}
                            </Text>
                        </View>
                    )}

                    <Text style={[styles.sectionTitle, { marginTop: 40, marginBottom: 20 }]}>
                        {isVisitor ? 'Explore Campus' : 'Jump Back In'}
                    </Text>
                    <View style={[styles.jumpBackRow, isMobile && styles.mobileJumpBackRow]}>
                        {!isVisitor && (
                            <JumpBackCard
                                type="chat"
                                title="RECENT CHAT"
                                content={recentChatDisplay}
                                buttonText="Resume Conversation"
                                icon={<MessageSquare size={20} color="white" />}
                                onPress={() => router.push('/(dashboard)/chat')}
                            />
                        )}
                        {isVisitor && (
                            <JumpBackCard
                                type="chat"
                                title="CAMPUS ASSISTANT"
                                content="Ask about campus guidelines, admission, and general GIMPA policies..."
                                buttonText="Ask a Question"
                                icon={<MessageSquare size={20} color="white" />}
                                onPress={() => router.push('/(dashboard)/visitor-chat')}
                            />
                        )}
                        <JumpBackCard
                            type="route"
                            title="CAMPUS MAP"
                            content="GIMPA Campus → Navigate"
                            subtext="Find buildings & directions"
                            buttonText="Open Navigation"
                            icon={<MapPin size={20} color="#102a43" />}
                            onPress={() => router.push('/(dashboard)/navigation')}
                        />
                        {isVisitor && (
                            <JumpBackCard
                                type="route"
                                title="ANNOUNCEMENTS"
                                content="Campus news & alerts"
                                subtext="Stay updated with GIMPA"
                                buttonText="View Announcements"
                                icon={<Megaphone size={20} color="#102a43" />}
                                onPress={() => router.push('/(dashboard)/announcements')}
                            />
                        )}
                    </View>
                </View>

                <View style={styles.rightColumn}>
                    {!isVisitor ? (
                        <Pressable
                            style={styles.actionButton}
                            onPress={() => router.push('/(dashboard)/chat')}
                        >
                            <MessageSquare size={20} color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.actionButtonText}>Ask Uni-Assist</Text>
                        </Pressable>
                    ) : (
                        <Pressable
                            style={styles.actionButton}
                            onPress={() => router.push('/(dashboard)/visitor-chat')}
                        >
                            <MessageSquare size={20} color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.actionButtonText}>Campus Assistant</Text>
                        </Pressable>
                    )}

                    <SectionHeader title="Campus News" icon={<Megaphone size={18} color="#102a43" />} />
                    <View style={styles.newsCard}>
                        {newsLoading ? (
                            <ActivityIndicator size="small" color="#102a43" style={{ marginVertical: 20 }} />
                        ) : newsItems.length > 0 ? (
                            <>
                                {newsItems.map((item, idx) => (
                                    <React.Fragment key={item.id}>
                                        {idx > 0 && <View style={styles.newsDivider} />}
                                        <NewsItem
                                            tag={item.type.toUpperCase()}
                                            time={getRelativeTime(item.created_at)}
                                            title={item.title}
                                            description={item.content.length > 120 ? item.content.substring(0, 120) + '...' : item.content}
                                        />
                                    </React.Fragment>
                                ))}
                            </>
                        ) : (
                            <Text style={{ color: '#627d98', textAlign: 'center', paddingVertical: 20 }}>No announcements yet.</Text>
                        )}
                        <Pressable style={styles.viewAllNews} onPress={() => router.push('/(dashboard)/announcements')}>
                            <Text style={styles.viewAllNewsText}>View All Announcements</Text>
                        </Pressable>
                    </View>

                    {!isVisitor && (
                        <>
                            <SectionHeader title="Quick Links" style={{ marginTop: 40 }} />
                            <View style={styles.quickLinksGrid}>
                                <QuickLinkCard icon={<Star size={24} color="#ef4444" />} label="Emergency" urgent onPress={() => router.push('/(dashboard)/emergency')} />
                            </View>
                        </>
                    )}
                </View>
            </View>

        </ScrollView>
    );
}

function SectionHeader({ title, action, icon, style, onActionPress }) {
    return (
        <View style={[styles.sectionHeader, style]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {action && <Pressable onPress={onActionPress}><Text style={styles.actionText}>{action}</Text></Pressable>}
        </View>
    );
}

function ScheduleItem({ time, period, course, location, active, disabled }) {
    const router = useRouter();
    return (
        <View style={[styles.scheduleCard, disabled && styles.disabledCard]}>
            <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{time}</Text>
                <Text style={styles.periodText}>{period}</Text>
            </View>
            <View style={styles.scheduleInfo}>
                <Text style={styles.courseName}>{course}</Text>
                <Text style={styles.locationText}>{location}</Text>
            </View>
            {!disabled && (
                <Pressable 
                    style={styles.navigateBtn}
                    onPress={() => router.push({ pathname: '/(dashboard)/navigation', params: { destination: location, autoNavigate: 'true' } })}
                >
                    <NavIcon size={14} color="#102a43" style={{ marginRight: 4 }} />
                    <Text style={styles.navigateBtnText}>Navigate</Text>
                </Pressable>
            )}
        </View>
    );
}

function NewsItem({ tag, time, title, description }) {
    return (
        <View style={styles.newsItem}>
            <View style={styles.newsMeta}>
                <View style={[styles.newsTag, tag === 'URGENT' ? styles.tagUrgent : styles.tagEvent]}>
                    <Text style={styles.tagText}>{tag}</Text>
                </View>
                <Text style={styles.newsTime}>{time}</Text>
            </View>
            <Text style={styles.newsTitle}>{title}</Text>
            <Text style={styles.newsDesc}>{description}</Text>
        </View>
    );
}

function QuickLinkCard({ icon, label, urgent, onPress }) {
    return (
        <Pressable style={[styles.quickLinkCard, urgent && styles.urgentLinkCard]} onPress={onPress}>
            {icon}
            <Text style={[styles.quickLinkLabel, urgent && styles.urgentLinkLabel]}>{label}</Text>
        </Pressable>
    );
}

function JumpBackCard({ type, title, content, subtext, buttonText, icon, onPress }) {
    const isChat = type === 'chat';
    return (
        <View style={[styles.jumpBackCard, isChat ? styles.chatCard : styles.routeCard]}>
            <View style={styles.jumpBackHeader}>
                <View style={styles.jumpBackIconWrapper}>
                    {icon}
                </View>
                <Text style={[styles.jumpBackTypeLabel, isChat ? styles.chatTypeLabel : styles.routeTypeLabel]}>{title}</Text>
            </View>

            <View style={styles.jumpBackContentArea}>
                <Text style={[styles.jumpBackContent, isChat ? styles.chatContent : styles.routeContent]}>
                    {content}
                </Text>
                {subtext && <Text style={styles.jumpBackSubtext}>{subtext}</Text>}
            </View>

            <Pressable 
                style={[styles.jumpBackBtn, isChat ? styles.chatBtn : styles.routeBtn]}
                onPress={onPress}
            >
                <Text style={isChat ? styles.chatBtnText : styles.routeBtnText}>{buttonText}</Text>
            </Pressable>
        </View>
    );
}

function ProgressCard({ title, score, trend, negative, noTrend }) {
    return (
        <View style={styles.progressCard}>
            <Text style={styles.progressCardTitle}>{title}</Text>
            <View style={styles.progressCardRow}>
                <Text style={styles.progressScore}>{score}</Text>
                {!noTrend && (
                    <Text style={[styles.progressTrend, negative ? styles.trendNegative : styles.trendPositive]}>
                        {trend}
                    </Text>
                )}
                {noTrend && <Text style={styles.trendStable}>{trend}</Text>}
            </View>
            <View style={styles.progressLine}><View style={[styles.progressLineFill, { width: score }]} /></View>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 40,
    },
    mobileScrollContent: {
        padding: 20,
    },
    welcomeSection: {
        marginBottom: 32,
    },
    greetingText: {
        fontSize: 42,
        fontWeight: '900',
        color: '#102a43',
        letterSpacing: -0.5,
    },
    mobileGreetingText: {
        fontSize: 32,
    },
    dateText: {
        fontSize: 18,
        color: '#486581',
        marginTop: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        gap: 40,
    },
    mobileGridContainer: {
        flexDirection: 'column',
        gap: 30,
    },
    leftColumn: {
        flex: 1.8,
    },
    rightColumn: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#102a43',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#486581',
    },
    scheduleCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#102a43',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    disabledCard: {
        opacity: 0.6,
    },
    timeContainer: {
        alignItems: 'center',
        width: 60,
        paddingRight: 15,
        borderRightWidth: 1,
        borderRightColor: '#f0f4f8',
    },
    timeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#102a43',
    },
    periodText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#627d98',
        textTransform: 'uppercase',
    },
    scheduleInfo: {
        flex: 1,
        marginLeft: 20,
    },
    courseName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#102a43',
        marginBottom: 4,
    },
    locationText: {
        fontSize: 13,
        color: '#627d98',
    },
    navigateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    navigateBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#102a43',
    },
    actionButton: {
        backgroundColor: '#001a33',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 12,
        marginBottom: 40,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    newsCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#102a43',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    newsItem: {
        marginBottom: 16,
    },
    newsMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    newsTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 10,
    },
    tagUrgent: {
        backgroundColor: '#fee2e2',
    },
    tagEvent: {
        backgroundColor: '#e0f2fe',
    },
    tagText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#102a43',
    },
    newsTime: {
        fontSize: 12,
        color: '#9fb3c8',
    },
    newsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#102a43',
        marginBottom: 6,
    },
    newsDesc: {
        fontSize: 13,
        color: '#627d98',
        lineHeight: 18,
    },
    newsDivider: {
        height: 1,
        backgroundColor: '#f0f4f8',
        marginVertical: 16,
    },
    viewAllNews: {
        alignItems: 'center',
        paddingTop: 8,
    },
    viewAllNewsText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#102a43',
    },
    quickLinksGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    quickLinkCard: {
        flex: 1,
        minWidth: '45%',
        aspectRatio: 1.2,
        backgroundColor: 'white',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#102a43',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    urgentLinkCard: {
        backgroundColor: '#fff1f2',
    },
    quickLinkLabel: {
        marginTop: 12,
        fontSize: 13,
        fontWeight: '600',
        color: '#102a43',
    },
    urgentLinkLabel: {
        color: '#ef4444',
    },
    jumpBackRow: {
        flexDirection: 'row',
        gap: 20,
    },
    mobileJumpBackRow: {
        flexDirection: 'column',
    },
    jumpBackCard: {
        flex: 1,
        borderRadius: 20,
        padding: 24,
        justifyContent: 'space-between',
        minHeight: 220,
    },
    chatCard: {
        backgroundColor: '#001a33',
    },
    routeCard: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e1e7ec',
    },
    jumpBackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    jumpBackIconWrapper: {
        marginRight: 10,
    },
    jumpBackTypeLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    chatTypeLabel: {
        color: '#9fb3c8',
    },
    routeTypeLabel: {
        color: '#486581',
    },
    jumpBackContentArea: {
        flex: 1,
        justifyContent: 'center',
    },
    jumpBackContent: {
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 24,
    },
    chatContent: {
        color: '#f0f4f8',
        fontStyle: 'italic',
    },
    routeContent: {
        color: '#102a43',
        fontSize: 18,
    },
    jumpBackSubtext: {
        fontSize: 13,
        color: '#627d98',
        marginTop: 6,
    },
    jumpBackBtn: {
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    chatBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    routeBtn: {
        backgroundColor: '#f0f4f8',
    },
    chatBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    routeBtnText: {
        color: '#102a43',
        fontWeight: 'bold',
        fontSize: 13,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 24,
    },
    progressGrid: {
        flexDirection: 'row',
        gap: 20,
    },
    progressCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#102a43',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    progressCardTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#9fb3c8',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    progressCardRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    progressScore: {
        fontSize: 28,
        fontWeight: '900',
        color: '#102a43',
        marginRight: 8,
    },
    progressTrend: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    trendPositive: {
        color: '#22c55e',
    },
    trendNegative: {
        color: '#ef4444',
    },
    trendStable: {
        color: '#9fb3c8',
        fontSize: 12,
        fontWeight: 'bold',
    },
    progressLine: {
        height: 6,
        backgroundColor: '#f0f4f8',
        borderRadius: 3,
    },
    progressLineFill: {
        height: '100%',
        backgroundColor: '#102a43',
        borderRadius: 3,
    },
    emptySchedule: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e1e7ec',
        borderStyle: 'dashed',
    },
    emptyScheduleText: {
        fontSize: 15,
        color: '#627d98',
        fontWeight: '500',
    }
});
