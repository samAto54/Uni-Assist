import { useState, useRef, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TextInput,
    Pressable, KeyboardAvoidingView, Platform,
    useWindowDimensions, ActivityIndicator
} from 'react-native';
import { Send, Sparkles, ArrowLeft, Library, MapPin, Shield, Navigation as NavIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { checkCampusQuickAnswer } from '../../lib/campusQuickAnswers';

const VISITOR_COURSE_PATTERNS = [
    'my course', 'my class', 'my timetable', 'my schedule', 'my lecturer',
    'course code', 'course outline', 'syllabus', 'what course', 'which course',
    'enrolled in', 'my grade', 'my gpa', 'my cgpa', 'my results',
    'when is mis', 'when is cs', 'lecturer for', 'who teaches',
];

const VISITOR_BLOCKED_REPLY =
    'Course and personal academic information is available to signed-in students only. Please log in to Uni-Assist, or contact the GIMPA Registry at 030-274-6000.';

const visitorChatStore = {
    messages: null,
    isSending: false,
    listeners: new Set(),

    notify() {
        this.listeners.forEach(fn => fn());
    },

    setMessages(updater) {
        const next = typeof updater === 'function' ? updater(this.messages || []) : updater;
        this.messages = next;
        this.notify();
    },

    setIsSending(val) {
        this.isSending = val;
        this.notify();
    },
};

function useVisitorChatStore() {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender(n => n + 1);
        visitorChatStore.listeners.add(listener);
        return () => visitorChatStore.listeners.delete(listener);
    }, []);
    return {
        messages: visitorChatStore.messages,
        isSending: visitorChatStore.isSending,
    };
}

function makeGreeting() {
    return {
        id: 'greeting',
        text: "Hello! I'm Uni-Assist Guest. I can help with campus guidelines, admission info, building locations, and general GIMPA policies. Sign in for course-specific help.",
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
}

function isCourseRelated(text) {
    const lower = text.toLowerCase();
    return VISITOR_COURSE_PATTERNS.some(p => lower.includes(p));
}

export default function VisitorChatScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { isVisitor, session } = useAuth();
    const router = useRouter();

    const [inputText, setInputText] = useState('');
    const scrollViewRef = useRef(null);
    const { messages, isSending } = useVisitorChatStore();

    useEffect(() => {
        if (!isVisitor && session) {
            router.replace('/(dashboard)/chat');
        } else if (!isVisitor && !session) {
            router.replace('/login');
        }
    }, [isVisitor, session, router]);

    useEffect(() => {
        if (visitorChatStore.messages === null) {
            visitorChatStore.messages = [makeGreeting()];
        }
    }, []);

    useEffect(() => {
        const id = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
        return () => clearTimeout(id);
    }, [messages]);

    const API_BASE_URL = process.env.EXPO_PUBLIC_CHAT_API_URL || 'http://localhost:4000';

    const sendMessage = useCallback(async () => {
        const trimmed = inputText.trim();
        if (!trimmed || visitorChatStore.isSending) return;

        const userMsg = {
            id: Date.now().toString() + 'u',
            text: trimmed,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        visitorChatStore.setMessages(prev => [...prev, userMsg]);
        setInputText('');

        if (isCourseRelated(trimmed)) {
            visitorChatStore.setMessages(prev => [...prev, {
                id: Date.now().toString() + 'b',
                text: VISITOR_BLOCKED_REPLY,
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }]);
            return;
        }

        const localAnswer = checkCampusQuickAnswer(trimmed);
        if (localAnswer) {
            visitorChatStore.setMessages(prev => [...prev, {
                id: Date.now().toString() + 'l',
                text: localAnswer.reply,
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                location: localAnswer.location,
            }]);
            return;
        }

        visitorChatStore.setIsSending(true);

        try {
            const history = (visitorChatStore.messages || [])
                .filter(m => m.id !== 'greeting' && (m.sender === 'user' || m.sender === 'ai'))
                .slice(-20)
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: m.text,
                }));

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    message: trimmed,
                    mode: 'visitor',
                    history,
                }),
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Server returned status: ${response.status}`);
            const data = await response.json();
            const locationHint = data.location ? `\n\nLocation: ${data.location}` : '';
            const aiText = `${data.reply || "I don't have enough campus information to answer that."}${locationHint}`;

            visitorChatStore.setMessages(prev => [...prev, {
                id: Date.now().toString() + 'a',
                text: aiText,
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                location: data.location || null,
            }]);
        } catch (err) {
            let errText = 'Network error. Please check your connection and try again.';
            if (err.name === 'AbortError') {
                errText = 'Campus assistant request timed out. Make sure `npm run server` is running on your PC, then try again.';
            } else if (err.message?.includes('Network request failed')) {
                errText = 'Cannot connect to campus server. Run `npm run server` on your PC and ensure your phone is on the same Wi-Fi.';
            }
            // Last resort: retry local FAQ in case phrasing was missed
            const fallback = checkCampusQuickAnswer(trimmed);
            if (fallback) {
                errText = fallback.reply;
            }
            visitorChatStore.setMessages(prev => [...prev, {
                id: Date.now().toString() + 'e',
                text: errText,
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                location: fallback?.location ?? null,
            }]);
        } finally {
            visitorChatStore.setIsSending(false);
        }
    }, [inputText, API_BASE_URL]);

    const suggestions = [
        { icon: <Shield size={16} color="#486581" />, label: 'Campus rules' },
        { icon: <Library size={16} color="#486581" />, label: 'Library hours' },
        { icon: <MapPin size={16} color="#486581" />, label: 'Find a building' },
    ];

    const displayMessages = messages || [makeGreeting()];

    if (!isVisitor) return null;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {isMobile && (
                        <Pressable
                            onPress={() => router.replace('/(dashboard)')}
                            style={styles.backBtn}
                        >
                            <ArrowLeft size={24} color="#102a43" />
                        </Pressable>
                    )}
                    <View style={styles.aiIconWrapper}>
                        <Sparkles size={20} color="white" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Campus Assistant</Text>
                        <Text style={[styles.headerStatus, isSending && { color: '#fbbf24' }]}>
                            {isSending ? 'Thinking...' : 'Guest mode \u2022 Guidelines only'}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
            >
                {displayMessages.map(msg => (
                    <View
                        key={msg.id}
                        style={[styles.messageRow, msg.sender === 'user' ? styles.userRow : styles.aiRow]}
                    >
                        {msg.sender === 'ai' && (
                            <View style={styles.aiAvatarSmall}>
                                <Sparkles size={12} color="white" />
                            </View>
                        )}
                        <View style={styles.bubbleWrapper}>
                            <View style={[
                                styles.bubble,
                                msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    msg.sender === 'user' ? styles.userText : styles.aiText,
                                ]}>
                                    {msg.text}
                                </Text>
                                <Text style={styles.timestamp}>{msg.timestamp}</Text>
                            </View>
                                    {msg.sender === 'ai' && msg.location && (
                                <Pressable
                                    style={styles.directionsBtn}
                                    onPress={() => router.push({
                                        pathname: '/(dashboard)/navigation',
                                        params: { destination: msg.location },
                                    })}
                                >
                                    <NavIcon size={14} color="white" style={{ marginRight: 6 }} />
                                    <Text style={styles.directionsBtnText}>
                                        Navigate to {msg.location}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                ))}
                {isSending && (
                    <View style={[styles.messageRow, styles.aiRow]}>
                        <View style={styles.aiAvatarSmall}>
                            <Sparkles size={12} color="white" />
                        </View>
                        <View style={[styles.bubble, styles.aiBubble, {
                            paddingVertical: 12, width: 60, alignItems: 'center',
                        }]}>
                            <ActivityIndicator size="small" color="#102a43" />
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.suggestionsScroll}
                    contentContainerStyle={styles.suggestionsContent}
                >
                    {suggestions.map((s, i) => (
                        <Pressable
                            key={`${s.label}-${i}`}
                            style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.85 }]}
                            onPress={() => setInputText(s.label)}
                        >
                            {s.icon}
                            <Text style={styles.suggestionLabel}>{s.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask about campus guidelines..."
                        placeholderTextColor="#9fb3c8"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        editable={!isSending}
                    />
                    <Pressable
                        onPress={sendMessage}
                        disabled={!inputText.trim() || isSending}
                        style={({ pressed }) => [
                            styles.sendBtn,
                            (!inputText.trim() || isSending) && styles.sendBtnDisabled,
                            pressed && { opacity: 0.85 },
                        ]}
                    >
                        {isSending
                            ? <ActivityIndicator size="small" color="white" />
                            : <Send size={20} color="white" />}
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        height: 72, backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#e1e7ec',
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 24,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    backBtn: { marginRight: 16 },
    aiIconWrapper: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#102a43', justifyContent: 'center',
        alignItems: 'center', marginRight: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43' },
    headerStatus: { fontSize: 12, color: '#10b981', fontWeight: '600' },
    chatArea: { flex: 1 },
    chatContent: { padding: 24, paddingBottom: 40 },
    messageRow: { flexDirection: 'row', marginBottom: 24, maxWidth: '85%' },
    userRow: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    aiRow: { alignSelf: 'flex-start' },
    aiAvatarSmall: {
        width: 24, height: 24, borderRadius: 8,
        backgroundColor: '#102a43', justifyContent: 'center',
        alignItems: 'center', marginTop: 8, marginRight: 8,
    },
    bubble: {
        padding: 16, borderRadius: 20, flexShrink: 1,
        shadowColor: '#102a43', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 10, elevation: 1,
    },
    userBubble: { backgroundColor: '#102a43', borderBottomRightRadius: 4 },
    aiBubble: {
        backgroundColor: 'white', borderBottomLeftRadius: 4,
        borderWidth: 1, borderColor: '#e1e7ec',
    },
    userText: { color: 'white' },
    aiText: { color: '#102a43' },
    timestamp: { fontSize: 10, marginTop: 8, opacity: 0.5, alignSelf: 'flex-end', color: '#486581' },
    bubbleWrapper: { flexShrink: 1, maxWidth: '100%' },
    messageText: { fontSize: 15, lineHeight: 22 },
    directionsBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#6366f1',
        borderRadius: 12,
        paddingVertical: 9, paddingHorizontal: 14,
        marginTop: 8, alignSelf: 'flex-start',
    },
    directionsBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
    inputSection: {
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e1e7ec',
        paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    },
    suggestionsScroll: { paddingVertical: 12 },
    suggestionsContent: { paddingHorizontal: 20, gap: 10 },
    suggestionChip: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, paddingHorizontal: 16,
        borderRadius: 20, borderWidth: 1, borderColor: '#e1e7ec', backgroundColor: '#f8fafc',
    },
    suggestionLabel: { marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#486581' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
    input: {
        flex: 1, backgroundColor: '#f0f4f8', borderRadius: 24,
        paddingHorizontal: 20, paddingVertical: 12, paddingTop: 12,
        maxHeight: 120, fontSize: 15, color: '#102a43',
    },
    sendBtn: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#102a43', justifyContent: 'center',
        alignItems: 'center', marginLeft: 12,
    },
    sendBtnDisabled: { opacity: 0.5 },
});
