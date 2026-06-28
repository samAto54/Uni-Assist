import { useState, useRef, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TextInput,
    Pressable, KeyboardAvoidingView, Platform,
    useWindowDimensions, ActivityIndicator, Alert
} from 'react-native';
import { Send, Sparkles, ArrowLeft, Library, MapPin, Search, Navigation as NavIcon, Edit2, X, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { checkCampusQuickAnswer } from '../../lib/campusQuickAnswers';
import MarkdownText from '../../components/MarkdownText';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL STORE
// Lives outside the component so it survives navigation (unmount/remount).
// When the user leaves the chat and comes back, the component re-reads this
// store and sees the full conversation including any AI reply that arrived
// while they were away.
// ─────────────────────────────────────────────────────────────────────────────
const chatStore = {
    messages: null,          // null = not yet loaded
    isSending: false,
    historyLoaded: false,
    listeners: new Set(),    // components that want to re-render on change

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

    reset() {
        this.messages = null;
        this.isSending = false;
        this.historyLoaded = false;
    },
};

// Hook that subscribes a component to the store
function useChatStore() {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender(n => n + 1);
        chatStore.listeners.add(listener);
        return () => chatStore.listeners.delete(listener);
    }, []);
    return {
        messages:   chatStore.messages,
        isSending:  chatStore.isSending,
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function makeGreeting(firstName) {
    return {
        id: 'greeting',
        text: `Hello ${firstName}! I'm Uni-Assist. How can I help you with your campus queries today?`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
}

export default function ChatScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { user, isVisitor } = useAuth();
    const router = useRouter();
    const firstName = isVisitor
        ? 'Visitor'
        : (user?.user_metadata?.full_name || user?.email || 'there').split(' ')[0];

    const [inputText, setInputText] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(false);
    const scrollViewRef = useRef(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');

    // Subscribe to the module-level store
    const { messages, isSending } = useChatStore();

    // Block visitor access — chat requires sign-in
    useEffect(() => {
        if (isVisitor) router.replace('/(dashboard)');
    }, [isVisitor, router]);

    // Initialise store with greeting if this is the first mount
    useEffect(() => {
        if (chatStore.messages === null) {
            chatStore.messages = [makeGreeting(firstName)];
        }
    }, [firstName]);

    // Reset store when user changes (logout / different account)
    const lastUserIdRef = useRef(null);
    useEffect(() => {
        if (user?.id && lastUserIdRef.current && lastUserIdRef.current !== user.id) {
            chatStore.reset();
            chatStore.messages = [makeGreeting(firstName)];
        }
        lastUserIdRef.current = user?.id || null;
    }, [user?.id, firstName]);

    // ── Auto-scroll whenever messages change ──────────────────────────────────
    useEffect(() => {
        const id = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
        return () => clearTimeout(id);
    }, [messages]);

    // ── Load history from Supabase once per user session ─────────────────────
    useEffect(() => {
        if (!user?.id || isVisitor || chatStore.historyLoaded) return;

        let cancelled = false;
        setLoadingHistory(true);

        supabase
            .from('chat_messages')
            .select('id, sender, content, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(100)
            .then(({ data, error }) => {
                if (cancelled) return;
                setLoadingHistory(false);
                if (error) { console.error('[Chat] history:', error.message); return; }

                chatStore.historyLoaded = true;

                if (data && data.length > 0) {
                    const history = data.map(m => ({
                        id: m.id,
                        text: m.content,
                        sender: m.sender,
                        timestamp: new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit',
                        }),
                    }));
                    // Only replace if no user messages have been sent yet in this session
                    chatStore.setMessages(prev => {
                        const hasUserMsg = prev.some(m => m.sender === 'user');
                        if (hasUserMsg) return prev; // don't overwrite in-progress conversation
                        return [makeGreeting(firstName), ...history];
                    });
                }
            });

        return () => { cancelled = true; };
    }, [user?.id, isVisitor, firstName]);

    const API_BASE_URL = process.env.EXPO_PUBLIC_CHAT_API_URL || 'http://localhost:4000';

    // ── Edit message ───────────────────────────────────────────────────────────
    const startEdit = useCallback((msg) => {
        setEditingMessageId(msg.id);
        setEditText(msg.text);
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingMessageId(null);
        setEditText('');
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editingMessageId || !editText.trim()) return;
        
        const trimmed = editText.trim();
        
        // Update in store
        chatStore.setMessages(prev => 
            prev.map(msg => 
                msg.id === editingMessageId 
                    ? { ...msg, text: trimmed }
                    : msg
            )
        );

        // Update in database if it's a persisted message (not greeting or error)
        const msgToEdit = (chatStore.messages || []).find(m => m.id === editingMessageId);
        if (msgToEdit && !msgToEdit.id.startsWith('greeting') && !msgToEdit.id.includes('e') && user?.id) {
            try {
                const { error } = await supabase
                    .from('chat_messages')
                    .update({ content: trimmed })
                    .eq('id', editingMessageId)
                    .eq('user_id', user.id);
                if (error) console.error('[Chat] edit message:', error.message);
            } catch (e) {
                console.error('[Chat] edit message error:', e.message);
            }
        }

        cancelEdit();
    }, [editingMessageId, editText, user?.id, cancelEdit]);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        const trimmed = inputText.trim();
        if (!trimmed || chatStore.isSending) return;

        // Lock history so a late fetch can't wipe this message
        chatStore.historyLoaded = true;

        const userMsg = {
            id: Date.now().toString() + 'u',
            text: trimmed,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        chatStore.setMessages(prev => [...prev, userMsg]);
        setInputText('');

        const localAnswer = checkCampusQuickAnswer(trimmed);
        if (localAnswer) {
            const aiText = localAnswer.reply;
            chatStore.setMessages(prev => [...prev, {
                id: Date.now().toString() + 'l',
                text: aiText,
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                location: localAnswer.location,
            }]);
            if (user?.id && !isVisitor) {
                supabase.from('chat_messages').insert([{
                    user_id: user.id, sender: 'ai', content: aiText,
                }]).then(({ error }) => {
                    if (error) console.error('[Chat] save ai msg:', error.message);
                });
            }
            return;
        }

        // Persist user message (fire-and-forget)
        if (user?.id && !isVisitor) {
            supabase.from('chat_messages').insert([{
                user_id: user.id, sender: 'user', content: trimmed,
            }]).then(({ error }) => {
                if (error) console.error('[Chat] save user msg:', error.message);
            });
        }

        chatStore.setIsSending(true);

        // ── AI fetch runs at module level — survives navigation ───────────────
        try {
            // Build conversation history from current messages (exclude greeting)
            const history = (chatStore.messages || [])
                .filter(m => m.id !== 'greeting' && (m.sender === 'user' || m.sender === 'ai'))
                .slice(-20) // last 10 exchanges = 20 messages
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
                    userId: user?.id,
                    history,   // ← conversation memory
                    metadata: {
                        department: user?.user_metadata?.department,
                        level: user?.user_metadata?.level,
                    },
                }),
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Server returned status: ${response.status}`);
            const data = await response.json();
            const locationHint = data.location ? `\n\nLocation: ${data.location}` : '';
            const aiText = `${data.reply || "I don't have enough campus information to answer that."}${locationHint}`;

            const aiMsg = {
                id: Date.now().toString() + 'a',
                text: aiText,
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                // Store location separately so we can show a directions button
                location: data.location || null,
            };
            // This updates the store — if the user is back on the chat screen
            // they see it immediately; if not, it's waiting for them when they return
            chatStore.setMessages(prev => [...prev, aiMsg]);

            if (user?.id && !isVisitor) {
                supabase.from('chat_messages').insert([{
                    user_id: user.id, sender: 'ai', content: aiText,
                }]).then(({ error }) => {
                    if (error) console.error('[Chat] save ai msg:', error.message);
                });
            }
        } catch (err) {
            let errText = 'Network error. Please check your connection and try again.';
            if (err.name === 'AbortError') {
                errText = 'Campus assistant request timed out. Make sure `npm run server` is running, then try again.';
            } else if (err.message?.includes('Network request failed')) {
                errText = 'Cannot connect to campus server. Run `npm run server` on your PC and ensure your phone is on the same Wi-Fi.';
            }
            const fallback = checkCampusQuickAnswer(trimmed);
            if (fallback) {
                errText = fallback.reply;
            }
            chatStore.setMessages(prev => [...prev, {
                id: Date.now().toString() + 'e',
                text: errText,
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                location: fallback?.location ?? null,
            }]);
        } finally {
            chatStore.setIsSending(false);
        }
    }, [inputText, user?.id, user?.user_metadata?.department, user?.user_metadata?.level, isVisitor, API_BASE_URL]);

    const suggestions = [
        { icon: <Library size={16} color="#486581" />, label: 'Library hours' },
        { icon: <MapPin size={16} color="#486581" />, label: 'Locate a building' },
        { icon: <Search size={16} color="#486581" />, label: 'Admission requirements' },
    ];

    const displayMessages = messages || [makeGreeting(firstName)];

    if (isVisitor) return null;

    // ── Render ────────────────────────────────────────────────────────────────
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
                        <Text style={styles.headerTitle}>Uni-Assist</Text>
                        <Text style={[styles.headerStatus, isSending && { color: '#fbbf24' }]}>
                            {isSending ? 'Thinking...' : 'Online \u2022 Ready to help'}
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
                {loadingHistory && (
                    <ActivityIndicator size="small" color="#102a43" style={{ marginBottom: 20 }} />
                )}
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
                            {editingMessageId === msg.id && msg.sender === 'user' ? (
                                <View style={[styles.bubble, styles.userBubble, styles.editingBubble]}>
                                    <TextInput
                                        style={styles.editInput}
                                        value={editText}
                                        onChangeText={setEditText}
                                        multiline
                                        autoFocus
                                        onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                                    />
                                    <View style={styles.editActions}>
                                        <Pressable style={styles.editActionBtn} onPress={cancelEdit}>
                                            <X size={16} color="white" />
                                        </Pressable>
                                        <Pressable style={styles.editActionBtn} onPress={saveEdit}>
                                            <Check size={16} color="white" />
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <View style={[
                                    styles.bubble,
                                    msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
                                ]}>
                                    {msg.sender === 'user' ? (
                                        <Text style={[styles.messageText, styles.userText]}>
                                            {msg.text}
                                        </Text>
                                    ) : (
                                        <MarkdownText
                                            text={msg.text}
                                            style={styles.aiText}
                                            dimStyle={styles.aiTextDim}
                                        />
                                    )}
                                    <Text style={styles.timestamp}>{msg.timestamp}</Text>
                                </View>
                            )}
                            {msg.sender === 'user' && editingMessageId !== msg.id && (
                                <Pressable style={styles.editBtn} onPress={() => startEdit(msg)}>
                                    <Edit2 size={14} color="#627d98" />
                                </Pressable>
                            )}
                            {/* Directions button — shown when AI mentions a campus location */}
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
                        placeholder="Ask me anything..."
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
    aiTextDim: { color: '#486581' },
    timestamp: { fontSize: 10, marginTop: 8, opacity: 0.5, alignSelf: 'flex-end', color: '#486581' },
    // Wrapper around bubble + directions button
    bubbleWrapper: { flexShrink: 1, maxWidth: '100%' },
    messageText: { fontSize: 15, lineHeight: 22 },
    // Directions button shown below AI messages that mention a location
    directionsBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#6366f1',
        borderRadius: 12,
        paddingVertical: 9, paddingHorizontal: 14,
        marginTop: 8, alignSelf: 'flex-start',
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
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
    // Edit message styles
    editBtn: {
        padding: 4,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    editingBubble: {
        padding: 12,
    },
    editInput: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        padding: 8,
        color: 'white',
        fontSize: 15,
        minHeight: 40,
        marginBottom: 8,
    },
    editActions: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
    },
    editActionBtn: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
    },
});
