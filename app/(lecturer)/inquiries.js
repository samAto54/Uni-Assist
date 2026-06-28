import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet, Text, View, ScrollView, Pressable,
    useWindowDimensions, ActivityIndicator, RefreshControl,
    TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import {
    MessageSquare, Clock, BookOpen, CheckCircle2,
    ChevronLeft, Send, Users,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import MarkdownText from '../../components/MarkdownText';

const STATUS_COLORS = {
    GENERAL:  { bg: '#eff6ff', text: '#1d4ed8', label: 'General' },
    URGENT:   { bg: '#fee2e2', text: '#991b1b', label: 'Urgent' },
    RESOLVED: { bg: '#f0fdf4', text: '#166534', label: 'Resolved' },
};

// ── Inquiry list screen ───────────────────────────────────────────────────────
export default function LecturerInquiriesScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { user } = useAuth();

    const [inquiries,  setInquiries]  = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter,     setFilter]     = useState('ALL');
    const [openThread, setOpenThread] = useState(null); // inquiry object when thread is open

    const loadInquiries = useCallback(async () => {
        try {
            // Get lecturer's assigned courses
            const assignedCodes = Array.isArray(user?.user_metadata?.course_codes)
                ? user.user_metadata.course_codes
                : null;

            const { data, error } = await supabase
                .from('inquiries')
                .select('id, student_id, course, question, status, created_at')
                .order('created_at', { ascending: false });
            if (error) throw error;

            // Filter inquiries to only show courses the lecturer teaches
            const filteredData = assignedCodes && assignedCodes.length > 0
                ? (data || []).filter(inq => assignedCodes.includes(inq.course))
                : (data || []);

            const rows = filteredData || [];
            const studentIds = [...new Set(rows.map(r => r.student_id).filter(Boolean))];
            let nameMap = {};
            if (studentIds.length > 0) {
                const { data: students } = await supabase
                    .from('students')
                    .select('id, full_name')
                    .in('id', studentIds);
                nameMap = (students || []).reduce((acc, s) => {
                    acc[s.id] = s;
                    return acc;
                }, {});
            }

            // Get latest message + unread count per inquiry
            const inquiryIds = rows.map(r => r.id);
            let latestMsgMap = {};
            let unreadMap = {};

            if (inquiryIds.length > 0) {
                const { data: allMsgs } = await supabase
                    .from('inquiry_messages')
                    .select('inquiry_id, sender_role, content, created_at')
                    .in('inquiry_id', inquiryIds)
                    .order('created_at', { ascending: false });

                (allMsgs || []).forEach(m => {
                    // Track latest message per inquiry for preview
                    if (!latestMsgMap[m.inquiry_id]) {
                        latestMsgMap[m.inquiry_id] = m.content;
                    }
                    // Count student messages as unread
                    if (m.sender_role === 'student') {
                        unreadMap[m.inquiry_id] = (unreadMap[m.inquiry_id] || 0) + 1;
                    }
                });
            }

            // Show ALL inquiries — deduplicate by student+course, keep latest
            // (a student may have both a (thread) row and a real question row)
            const seen = new Set();
            const deduped = rows
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .filter(row => {
                    const key = `${row.student_id}|${row.course}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

            setInquiries(deduped.map(row => ({
                ...row,
                studentName: nameMap[row.student_id]?.full_name || 'Unknown Student',
                indexNumber: (row.student_id || '').slice(0, 7).toUpperCase(),
                unread: unreadMap[row.id] || 0,
                preview: latestMsgMap[row.id] ||
                    (row.question !== '(thread)' ? row.question : 'Tap to open conversation'),
            })));
        } catch (e) {
            console.error('[Inquiries] load:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadInquiries(); }, [loadInquiries]);

    async function markResolved(id) {
        try {
            const { error } = await supabase.from('inquiries').update({ status: 'RESOLVED' }).eq('id', id).select();
            if (error) {
                console.error('[markResolved] Error:', error.message, error.code, error.details);
                Alert.alert('Error', 'Failed to mark as resolved. Please try again.');
                return;
            }
            // Update local state
            setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: 'RESOLVED' } : i));
            if (openThread?.id === id) setOpenThread(t => ({ ...t, status: 'RESOLVED' }));
            // Reload inquiries to ensure consistency
            await loadInquiries();
        } catch (e) {
            console.error('[markResolved] Exception:', e.message);
            Alert.alert('Error', 'Failed to mark as resolved. Please try again.');
        }
    }

    const filtered = filter === 'ALL'
        ? inquiries
        : inquiries.filter(i => i.status === filter);

    const pendingCount = inquiries.filter(i => i.status !== 'RESOLVED').length;

    // ── Thread view ───────────────────────────────────────────────────────────
    if (openThread) {
        return (
            <ThreadView
                inquiry={openThread}
                lecturerId={user?.id}
                onBack={() => { setOpenThread(null); loadInquiries(); }}
                onResolve={() => markResolved(openThread.id)}
                onOpen={() => {
                    // Clear unread count for this inquiry when thread is opened
                    setInquiries(prev => prev.map(i => 
                        i.id === openThread.id ? { ...i, unread: 0 } : i
                    ));
                }}
                isMobile={isMobile}
            />
        );
    }

    // ── List view ─────────────────────────────────────────────────────────────
    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); loadInquiries(); }}
                />
            }
        >
            <View style={styles.headerSection}>
                <Text style={[styles.title, isMobile && styles.mobileTitle]}>Student Inquiries</Text>
                <Text style={styles.subtitle}>
                    {pendingCount} open {pendingCount === 1 ? 'inquiry' : 'inquiries'} from your students.
                </Text>
            </View>

            <View style={styles.filterRow}>
                {['ALL', 'URGENT', 'GENERAL', 'RESOLVED'].map(f => (
                    <Pressable
                        key={f}
                        style={[styles.filterChip, filter === f && styles.filterChipActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#102a43" style={{ marginVertical: 40 }} />
            ) : filtered.length === 0 ? (
                <View style={styles.emptyState}>
                    <MessageSquare size={40} color="#d9e2ec" />
                    <Text style={styles.emptyTitle}>No inquiries yet</Text>
                    <Text style={styles.emptySubtext}>
                        When students send messages from a course page, they'll appear here.
                    </Text>
                </View>
            ) : (
                filtered.map(inq => {
                    const sc = STATUS_COLORS[inq.status] || STATUS_COLORS.GENERAL;
                        return (
                        <Pressable
                            key={inq.id}
                            style={styles.inquiryCard}
                            onPress={() => setOpenThread(inq)}
                        >
                            <View style={styles.cardTop}>
                                <View style={styles.cardTopLeft}>
                                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                                        <Text style={[styles.statusBadgeText, { color: sc.text }]}>{sc.label}</Text>
                                    </View>
                                    <Text style={styles.courseCode}>{inq.course}</Text>
                                </View>
                                {inq.unread > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{inq.unread}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.inquiryMeta}>
                                <BookOpen size={13} color="#627d98" />
                                <Text style={styles.metaText}>{inq.studentName}</Text>
                                <Text style={styles.metaDot}>·</Text>
                                <Text style={styles.metaText}>#{inq.indexNumber}</Text>
                                <Text style={styles.metaDot}>·</Text>
                                <Clock size={12} color="#9fb3c8" />
                                <Text style={styles.metaText}>{formatRelative(inq.created_at)}</Text>
                            </View>

                            <Text style={styles.questionPreview} numberOfLines={2}>
                                {inq.preview}
                            </Text>

                            <View style={styles.cardFooter}>
                                <Text style={styles.openThreadText}>Open conversation →</Text>
                            </View>
                        </Pressable>
                    );
                })
            )}
        </ScrollView>
    );
}

// ── Thread view component ─────────────────────────────────────────────────────
function ThreadView({ inquiry, lecturerId, onBack, onResolve, onOpen, isMobile }) {
    const scrollRef  = useRef(null);
    const [messages, setMessages]   = useState([]);
    const [loading,  setLoading]    = useState(true);
    const [msgText,  setMsgText]    = useState('');
    const [sending,  setSending]    = useState(false);
    const [sendErr,  setSendErr]    = useState('');

    // Clear unread count when thread opens
    useEffect(() => {
        if (onOpen) onOpen();
    }, []);

    const loadMessages = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inquiry_messages')
                .select('id, sender_id, sender_role, content, created_at')
                .eq('inquiry_id', inquiry.id)
                .order('created_at', { ascending: true });
            if (error) {
                console.error('[ThreadView] loadMessages error:', error.message, error.code);
            }
            setMessages((data || []).filter(m => m.content !== '(thread)'));
        } catch (e) {
            console.error('[Thread] load:', e.message);
        } finally {
            setLoading(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
        }
    }, [inquiry.id]);

    // Load messages
    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    // Realtime subscription (cleanup timeouts created by incoming messages)
    useEffect(() => {
        const timeouts = new Set();
        const channel = supabase
            .channel(`lecturer_thread_${inquiry.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'inquiry_messages',
                filter: `inquiry_id=eq.${inquiry.id}`,
            }, (payload) => {
                const msg = payload.new;
                if (msg.content === '(thread)') return;
                setMessages(prev => {
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
                timeouts.add(id);
            })
            .subscribe();
        return () => {
            timeouts.forEach(id => clearTimeout(id));
            supabase.removeChannel(channel);
        };
    }, [inquiry.id]);

    async function sendReply() {
        const text = msgText.trim();
        if (!text || !lecturerId) return;
        setSending(true);
        setSendErr('');
        setMsgText('');
        try {
            const { data: msg, error } = await supabase
                .from('inquiry_messages')
                .insert([{
                    inquiry_id:  inquiry.id,
                    sender_id:   lecturerId,
                    sender_role: 'lecturer',
                    content:     text,
                }])
                .select()
                .single();
            if (error) {
                console.error('[Reply] error:', error.message, error.code);
                setSendErr(`Failed: ${error.message}`);
                setMsgText(text); // restore
                return;
            }
            setMessages(prev => [...prev, msg]);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
            // Clear unread count when lecturer replies
            if (onOpen) onOpen();
        } catch (e) {
            console.error('[Thread] send:', e.message);
            setSendErr('Network error. Try again.');
            setMsgText(text);
        } finally {
            setSending(false);
        }
    }

    const sc = STATUS_COLORS[inquiry.status] || STATUS_COLORS.GENERAL;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#f8fafc' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Thread header */}
            <View style={styles.threadHeader}>
                <Pressable onPress={onBack} style={styles.backBtn}>
                        <ChevronLeft size={24} color="#102a43" />
                    </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={styles.threadCourse}>{inquiry.course}</Text>
                    <Text style={styles.threadStudent}>
                        {inquiry.studentName} · #{inquiry.indexNumber}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: sc.text }]}>{sc.label}</Text>
                </View>
                {inquiry.status !== 'RESOLVED' && (
                    <Pressable style={styles.resolveBtn} onPress={onResolve}>
                        <CheckCircle2 size={16} color="white" />
                    </Pressable>
                )}
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollRef}
                style={styles.threadBody}
                contentContainerStyle={styles.threadBodyContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#102a43" style={{ marginTop: 40 }} />
                ) : messages.length === 0 ? (
                    <View style={styles.emptyThread}>
                        <MessageSquare size={32} color="#d9e2ec" />
                        <Text style={styles.emptyThreadText}>No messages yet in this thread.</Text>
                    </View>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender_role === 'lecturer';
                        return (
                            <View key={msg.id} style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
                                {!isMe && (
                                    <View style={styles.studentAvatar}>
                                        <Text style={styles.avatarText}>
                                            {inquiry.studentName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                                    {!isMe && (
                                        <Text style={styles.senderLabel}>{inquiry.studentName}</Text>
                                    )}
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
            </ScrollView>

            {/* Reply input */}
            {inquiry.status !== 'RESOLVED' ? (
                <View>
                    {sendErr ? (
                        <Text style={styles.sendErrText}>{sendErr}</Text>
                    ) : null}
                    <View style={styles.replyBar}>
                        <TextInput
                            style={styles.replyInput}
                            placeholder="Reply to student…"
                            placeholderTextColor="#9fb3c8"
                            value={msgText}
                            onChangeText={setMsgText}
                            multiline
                            editable={!sending}
                            returnKeyType="send"
                            blurOnSubmit={false}
                            onSubmitEditing={sendReply}
                        />
                        <Pressable
                            style={[styles.sendBtn, (!msgText.trim() || sending) && styles.sendBtnDisabled]}
                            onPress={sendReply}
                            disabled={!msgText.trim() || sending}
                        >
                            {sending
                                ? <ActivityIndicator size="small" color="white" />
                                : <Send size={18} color="white" />}
                        </Pressable>
                    </View>
                </View>
            ) : (
                <View style={styles.resolvedBar}>
                    <CheckCircle2 size={16} color="#166534" />
                    <Text style={styles.resolvedBarText}>This inquiry has been resolved.</Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

function formatRelative(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
}

const styles = StyleSheet.create({
    // List view
    scrollArea: { flex: 1 },
    scrollContent: { padding: 40 },
    mobileScrollContent: { padding: 20 },
    headerSection: { marginBottom: 24 },
    title: { fontSize: 32, fontWeight: '900', color: '#102a43' },
    mobileTitle: { fontSize: 24 },
    subtitle: { fontSize: 16, color: '#486581', marginTop: 8 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e1e7ec' },
    filterChipActive: { backgroundColor: '#102a43', borderColor: '#102a43' },
    filterChipText: { fontSize: 13, fontWeight: '600', color: '#486581' },
    filterChipTextActive: { color: 'white' },

    inquiryCard: { backgroundColor: 'white', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#e1e7ec' },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    courseCode: { fontSize: 14, fontWeight: 'bold', color: '#102a43' },
    unreadBadge: { backgroundColor: '#ef4444', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    unreadText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
    inquiryMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
    metaText: { fontSize: 12, color: '#627d98', fontWeight: '500' },
    metaDot: { color: '#d9e2ec', fontSize: 12 },
    questionPreview: { fontSize: 15, color: '#334e68', lineHeight: 22 },
    cardFooter: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f4f8', paddingTop: 10 },
    openThreadText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },

    emptyState: { backgroundColor: 'white', borderRadius: 20, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#e1e7ec' },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43', marginTop: 14 },
    emptySubtext: { fontSize: 14, color: '#9fb3c8', marginTop: 8, textAlign: 'center', lineHeight: 20 },

    // Thread view
    threadHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#e1e7ec',
    },
    backBtn: { padding: 4 },
    threadCourse: { fontSize: 16, fontWeight: '700', color: '#102a43' },
    threadStudent: { fontSize: 13, color: '#627d98', marginTop: 2 },
    resolveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    threadBody: { flex: 1, backgroundColor: '#f8fafc' },
    threadBodyContent: { padding: 20, gap: 12, paddingBottom: 20 },
    emptyThread: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyThreadText: { fontSize: 14, color: '#9fb3c8', textAlign: 'center' },

    msgRow: { flexDirection: 'row', maxWidth: '85%', marginBottom: 12 },
    msgRowRight: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    msgRowLeft: { alignSelf: 'flex-start' },
    studentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 4 },
    avatarText: { color: '#3730a3', fontSize: 12, fontWeight: 'bold' },
    msgBubble: { padding: 14, borderRadius: 18, flexShrink: 1 },
    myBubble: { backgroundColor: '#102a43', borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: 'white', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e1e7ec' },
    senderLabel: { fontSize: 11, fontWeight: '700', color: '#486581', marginBottom: 4 },
    myMsgText: { fontSize: 15, color: 'white', lineHeight: 22 },
    theirMsgText: { fontSize: 15, color: '#102a43', lineHeight: 22 },
    msgTime: { fontSize: 10, marginTop: 6, opacity: 0.5, alignSelf: 'flex-end', color: '#9fb3c8' },

    replyBar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e1e7ec', gap: 10 },
    replyInput: { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#102a43', maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#102a43', justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.4 },
    resolvedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, backgroundColor: '#f0fdf4', borderTopWidth: 1, borderTopColor: '#bbf7d0' },
    resolvedBarText: { fontSize: 14, color: '#166534', fontWeight: '600' },
    sendErrText: { fontSize: 12, color: '#ef4444', textAlign: 'center', paddingHorizontal: 16, paddingTop: 8 },
});
