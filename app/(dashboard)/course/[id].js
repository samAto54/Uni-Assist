import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView,
    useWindowDimensions, ActivityIndicator, TextInput,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft, Clock, CheckCircle2,
    FileText, MessageSquare, Send, Users,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import MarkdownText from '../../../components/MarkdownText';

export default function CourseDetailScreen() {
    const { id: courseCode } = useLocalSearchParams();
    const router  = useRouter();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { user } = useAuth();
    const scrollRef = useRef(null);

    const [outlineData, setOutlineData] = useState(null);
    const [courseInfo,  setCourseInfo]  = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [outlineErr,  setOutlineErr]  = useState(null);
    const [classSize,   setClassSize]   = useState(0);

    // Messaging
    const inquiryIdRef = useRef(null);
    const [inquiryId,  setInquiryId]  = useState(null);
    const [messages,   setMessages]   = useState([]);
    const [msgLoading, setMsgLoading] = useState(false);
    const [msgText,    setMsgText]    = useState('');
    const [sending,    setSending]    = useState(false);
    const [sendError,  setSendError]  = useState('');

    async function init() {
        setLoading(true);
        setOutlineErr(null);
        try {
            // ── Fetch course — only columns guaranteed to exist ────────────────
            const { data: course, error: ce } = await supabase
                .from('courses')
                .select('code, name, level, department')
                .eq('code', courseCode)
                .maybeSingle();
            if (ce) console.error('[Course] fetch:', ce.message);
            if (course) setCourseInfo(course);

            // ── Try to get class_size separately (column may not exist yet) ────
            const { data: sizeRow } = await supabase
                .from('courses')
                .select('class_size')
                .eq('code', courseCode)
                .maybeSingle();
            if (sizeRow?.class_size != null) setClassSize(sizeRow.class_size);

            // ── Outline ───────────────────────────────────────────────────────
            const { data: outline, error: oe } = await supabase
                .from('course_outlines')
                .select('*')
                .eq('course_code', courseCode)
                .maybeSingle();
            if (oe && oe.code !== 'PGRST116') console.error('[Outline]', oe.message);
            setOutlineData(outline || null);
            if (!outline) setOutlineErr('No outline has been published for this course yet.');

            // ── Enrollment ────────────────────────────────────────────────────
            if (user?.id) {
                const { data: existing, error: ee } = await supabase
                    .from('course_enrollments')
                    .select('id')
                    .eq('student_id', user.id)
                    .eq('course_code', courseCode)
                    .maybeSingle();

                if (ee) {
                    // Table doesn't exist yet — skip silently
                    console.warn('[Enroll] table not ready:', ee.message);
                } else if (!existing) {
                    const { error: ie } = await supabase
                        .from('course_enrollments')
                        .insert([{ student_id: user.id, course_code: courseCode }]);
                    if (ie) {
                        console.warn('[Enroll] insert:', ie.message);
                    } else {
                        // Increment class_size
                        const currentSize = sizeRow?.class_size ?? 0;
                        await supabase
                            .from('courses')
                            .update({ class_size: currentSize + 1 })
                            .eq('code', courseCode);
                        setClassSize(currentSize + 1);
                    }
                }

                // ── Load / create messaging thread ────────────────────────────
                await loadThread();
            }
        } catch (err) {
            console.error('[Init]', err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { init(); }, [courseCode, user?.id]);

    const loadThread = useCallback(async () => {
        if (!user?.id) return;
        setMsgLoading(true);
        try {
            // Find existing thread
            let { data: inq, error: fe } = await supabase
                .from('inquiries')
                .select('id')
                .eq('student_id', user.id)
                .eq('course', courseCode)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fe) console.warn('[Thread] find:', fe.message);

            if (!inq) {
                // Create thread-starter row
                const { data: newInq, error: ne } = await supabase
                    .from('inquiries')
                    .insert([{
                        student_id: user.id,
                        course:     courseCode,
                        question:   '(thread)',
                        status:     'GENERAL',
                    }])
                    .select('id')
                    .single();

                if (ne) {
                    console.error('[Thread] create error:', ne.message);
                    return;
                }
                inq = newInq;
            }

            if (!inq?.id) return;
            setInquiryId(inq.id);
            inquiryIdRef.current = inq.id;

            // Load existing messages
            const { data: msgs, error: me } = await supabase
                .from('inquiry_messages')
                .select('id, sender_id, sender_role, content, created_at')
                .eq('inquiry_id', inq.id)
                .order('created_at', { ascending: true });

            if (me) console.warn('[Thread] messages:', me.message);
            setMessages((msgs || []).filter(m => m.content !== '(thread)'));
        } catch (e) {
            console.error('[Thread] load:', e.message);
        } finally {
            setMsgLoading(false);
        }
    }, [user?.id, courseCode]);

    // Realtime — new messages appear instantly
    useEffect(() => {
        const iid = inquiryIdRef.current;
        if (!iid) return;
        const timeouts = new Set();
        const channel = supabase
            .channel(`student_thread_${iid}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public',
                table: 'inquiry_messages',
                filter: `inquiry_id=eq.${iid}`,
            }, (payload) => {
                const msg = payload.new;
                if (msg.content === '(thread)') return;
                setMessages(prev =>
                    prev.find(m => m.id === msg.id) ? prev : [...prev, msg]
                );
                const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
                timeouts.add(id);
            })
            .subscribe();
        return () => { timeouts.forEach(id => clearTimeout(id)); supabase.removeChannel(channel); };
    }, [inquiryId]);

    async function sendMessage() {
        const text = msgText.trim();
        const iid  = inquiryIdRef.current;
        setSendError('');

        if (!text) return;
        if (!iid) {
            setSendError('Thread not ready — please wait a moment and try again.');
            return;
        }
        if (!user?.id) return;

        setSending(true);
        setMsgText('');
        try {
            const { data: msg, error: me } = await supabase
                .from('inquiry_messages')
                .insert([{
                    inquiry_id:  iid,
                    sender_id:   user.id,
                    sender_role: 'student',
                    content:     text,
                }])
                .select()
                .single();

            if (me) {
                console.error('[Send]', me.message, me.code);
                setSendError(me.message);
                setMsgText(text);
                return;
            }
            setMessages(prev => [...prev, msg]);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
        } catch (e) {
            console.error('[Send] catch:', e.message);
            setSendError('Network error — please try again.');
            setMsgText(text);
        } finally {
            setSending(false);
        }
    }

    const outlineItems = outlineData?.outline
        ? outlineData.outline.split('\n').map(l => l.trim()).filter(Boolean)
        : [];

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ScrollView
                ref={scrollRef}
                style={styles.scrollArea}
                contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
                showsVerticalScrollIndicator={false}
            >
                <Pressable style={styles.backButton} onPress={() => router.push('/(dashboard)/courses')}>
                    <ArrowLeft size={24} color="#102a43" />
                    {!isMobile && <Text style={styles.backText}>Back to Courses</Text>}
                </Pressable>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#102a43" />
                        <Text style={styles.loadingText}>Loading course...</Text>
                    </View>
                ) : (
                    <>
                        {/* ── Header ─────────────────────────────────────────── */}
                        <View style={styles.headerSection}>
                            <View style={styles.headerTopRow}>
                                <View style={styles.courseCodeBadge}>
                                    <Text style={styles.courseCodeBadgeText}>
                                        {outlineData?.course_code || courseCode}
                                    </Text>
                                </View>
                                {classSize > 0 && (
                                    <View style={styles.classSizeBadge}>
                                        <Users size={13} color="#486581" />
                                        <Text style={styles.classSizeText}>{classSize} enrolled</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.title, isMobile && styles.mobileTitle]}>
                                {outlineData?.title || courseInfo?.name || courseCode}
                            </Text>
                            {outlineData?.lecturer && (
                                <Text style={styles.subtitle}>Lecturer: {outlineData.lecturer}</Text>
                            )}
                        </View>

                        {/* ── Outline ────────────────────────────────────────── */}
                        {outlineErr ? (
                            <View style={styles.card}>
                                <View style={styles.content}>
                                    <FileText size={32} color="#9fb3c8" style={{ marginBottom: 12, alignSelf: 'center' }} />
                                    <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Outline Not Available</Text>
                                    <Text style={styles.outlineText}>{outlineErr}</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.card}>
                                <View style={styles.content}>
                                    <Text style={styles.sectionTitle}>Course Outline</Text>
                                    <View style={styles.outlineList}>
                                        {outlineItems.map((item, i) => (
                                            <View key={`${item}-${i}`} style={styles.outlineItem}>
                                                <View style={styles.bulletPoint}><View style={styles.bulletDot} /></View>
                                                <Text style={styles.outlineText}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <View style={styles.metaRow}>
                                        <View style={styles.metaBadge}>
                                            <Clock size={16} color="#627d98" />
                                            <Text style={styles.metaBadgeText}>3 Credits</Text>
                                        </View>
                                        <View style={styles.metaBadge}>
                                            <CheckCircle2 size={16} color="#10b981" />
                                            <Text style={[styles.metaBadgeText, { color: '#10b981' }]}>Enrolled</Text>
                                        </View>
                                        {classSize > 0 && (
                                            <View style={styles.metaBadge}>
                                                <Users size={16} color="#627d98" />
                                                <Text style={styles.metaBadgeText}>{classSize} students</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* ── Chat with Lecturer ─────────────────────────────── */}
                        {user && (
                            <View style={[styles.card, { marginTop: 16 }]}>
                                <View style={styles.threadHeader}>
                                    <MessageSquare size={18} color="#102a43" />
                                    <Text style={styles.threadTitle}>Chat with Lecturer</Text>
                                </View>

                                <View style={styles.threadBody}>
                                    {msgLoading ? (
                                        <ActivityIndicator size="small" color="#102a43" style={{ margin: 20 }} />
                                    ) : messages.length === 0 ? (
                                        <View style={styles.emptyThread}>
                                            <Text style={styles.emptyThreadText}>
                                                No messages yet. Send a question to your lecturer below.
                                            </Text>
                                        </View>
                                    ) : (
                                        messages.map(msg => {
                                            const isMe = msg.sender_id === user.id;
                                            return (
                                                <View key={msg.id} style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
                                                    {!isMe && (
                                                        <View style={styles.lecturerAvatar}>
                                                            <Text style={styles.lecturerAvatarText}>L</Text>
                                                        </View>
                                                    )}
                                                    <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                                                        {!isMe && <Text style={styles.senderLabel}>Lecturer</Text>}
                                                        <MarkdownText
                                                            text={msg.content}
                                                            style={isMe ? styles.myMsgText : styles.theirMsgText}
                                                        />
                                                        <Text style={styles.msgTime}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </Text>
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </View>

                                {sendError ? (
                                    <Text style={styles.sendErrorText}>{sendError}</Text>
                                ) : null}

                                <View style={styles.threadInput}>
                                    <TextInput
                                        style={styles.msgInput}
                                        placeholder="Ask your lecturer something..."
                                        placeholderTextColor="#9fb3c8"
                                        value={msgText}
                                        onChangeText={setMsgText}
                                        multiline
                                        editable={!sending}
                                        returnKeyType="send"
                                        blurOnSubmit={false}
                                        onSubmitEditing={sendMessage}
                                    />
                                    <Pressable
                                        style={[styles.sendBtn, (!msgText.trim() || sending) && styles.sendBtnDisabled]}
                                        onPress={sendMessage}
                                        disabled={!msgText.trim() || sending}
                                    >
                                        {sending
                                            ? <ActivityIndicator size="small" color="white" />
                                            : <Send size={18} color="white" />}
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scrollArea: { flex: 1 },
    scrollContent: { padding: 40, maxWidth: 800, alignSelf: 'center', width: '100%', paddingBottom: 80 },
    mobileScrollContent: { padding: 20, paddingTop: 60, paddingBottom: 80 },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
    backText: { fontSize: 16, fontWeight: '600', color: '#102a43' },
    centerContainer: { paddingVertical: 100, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#486581' },
    headerSection: { marginBottom: 32 },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
    courseCodeBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    courseCodeBadgeText: { color: '#3730a3', fontWeight: 'bold', fontSize: 14 },
    classSizeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0f4f8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    classSizeText: { fontSize: 13, fontWeight: '600', color: '#486581' },
    title: { fontSize: 32, fontWeight: '900', color: '#102a43' },
    mobileTitle: { fontSize: 24 },
    subtitle: { fontSize: 16, color: '#486581', marginTop: 8 },
    card: { backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e1e7ec', overflow: 'hidden', shadowColor: '#102a43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
    content: { padding: 24 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#102a43', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
    outlineList: { gap: 16, marginBottom: 32 },
    outlineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    bulletPoint: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' },
    outlineText: { fontSize: 16, color: '#334e68', flex: 1, lineHeight: 24 },
    metaRow: { flexDirection: 'row', gap: 10, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#f0f4f8', flexWrap: 'wrap' },
    metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e1e7ec', gap: 6 },
    metaBadgeText: { fontSize: 13, fontWeight: '600', color: '#627d98' },
    threadHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f4f8' },
    threadTitle: { fontSize: 16, fontWeight: '700', color: '#102a43' },
    threadBody: { padding: 16, gap: 12, minHeight: 80 },
    emptyThread: { paddingVertical: 24, alignItems: 'center' },
    emptyThreadText: { fontSize: 14, color: '#9fb3c8', textAlign: 'center', lineHeight: 20 },
    msgRow: { flexDirection: 'row', marginBottom: 12, maxWidth: '85%' },
    msgRowRight: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    msgRowLeft: { alignSelf: 'flex-start' },
    lecturerAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#102a43', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 4 },
    lecturerAvatarText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    msgBubble: { padding: 14, borderRadius: 18, flexShrink: 1 },
    myBubble: { backgroundColor: '#102a43', borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: '#f0f4f8', borderBottomLeftRadius: 4 },
    senderLabel: { fontSize: 11, fontWeight: '700', color: '#486581', marginBottom: 4 },
    myMsgText: { fontSize: 15, color: 'white', lineHeight: 22 },
    theirMsgText: { fontSize: 15, color: '#102a43', lineHeight: 22 },
    msgTime: { fontSize: 10, marginTop: 6, opacity: 0.5, alignSelf: 'flex-end', color: '#9fb3c8' },
    sendErrorText: { fontSize: 13, color: '#ef4444', paddingHorizontal: 16, paddingBottom: 8, textAlign: 'center' },
    threadInput: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#f0f4f8', gap: 10 },
    msgInput: { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#102a43', maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#102a43', justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.4 },
});
