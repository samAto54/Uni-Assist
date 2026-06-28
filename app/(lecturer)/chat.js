/**
 * app/(lecturer)/chat.js
 * AI Assistant for lecturers — same Uni-Assist backend, lecturer-aware context.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TextInput,
    Pressable, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert,
} from 'react-native';
import { Send, Sparkles, Library, BookOpen, Users, Search, Edit2, X, Check } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import MarkdownText from '../../components/MarkdownText';

// ── Module-level store (survives navigation) ──────────────────────────────────
const store = {
    messages: null,
    isSending: false,
    listeners: new Set(),
    notify() { this.listeners.forEach(fn => fn()); },
    setMessages(updater) {
        this.messages = typeof updater === 'function' ? updater(this.messages || []) : updater;
        this.notify();
    },
    setIsSending(v) { this.isSending = v; this.notify(); },
    reset() { this.messages = null; this.isSending = false; },
};

function useStore() {
    const [, rerender] = useState(0);
    useEffect(() => {
        const fn = () => rerender(n => n + 1);
        store.listeners.add(fn);
        return () => store.listeners.delete(fn);
    }, []);
    return { messages: store.messages, isSending: store.isSending };
}

function greeting(name) {
    return {
        id: 'greeting', sender: 'ai',
        text: `Hi ${name}! I'm Uni-Assist. I can help you with campus info, student policies, course questions, or anything GIMPA-related. What do you need?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
}

export default function LecturerChatScreen() {
    const { user } = useAuth();
    const firstName = (user?.user_metadata?.full_name || 'Lecturer').split(' ')[0];
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);
    const { messages, isSending } = useStore();
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');

    const API_BASE = process.env.EXPO_PUBLIC_CHAT_API_URL || 'http://localhost:4000';

    // Init greeting
    useEffect(() => {
        if (store.messages === null) store.messages = [greeting(firstName)];
    }, [firstName]);

    // Reset on user change
    const lastUid = useRef(null);
    useEffect(() => {
        if (user?.id && lastUid.current && lastUid.current !== user.id) {
            store.reset();
            store.messages = [greeting(firstName)];
        }
        lastUid.current = user?.id || null;
    }, [user?.id, firstName]);

    useEffect(() => {
        const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
        return () => clearTimeout(id);
    }, [messages]);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || store.isSending) return;

        const userMsg = {
            id: Date.now() + 'u', sender: 'user', text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        store.setMessages(prev => [...prev, userMsg]);
        setInput('');
        store.setIsSending(true);

        try {
            const history = (store.messages || [])
                .filter(m => m.id !== 'greeting' && (m.sender === 'user' || m.sender === 'ai'))
                .slice(-20)
                .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

            const ctrl = new AbortController();
            const tid  = setTimeout(() => ctrl.abort(), 20000);

            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: ctrl.signal,
                body: JSON.stringify({
                    message: text,
                    userId: user?.id,
                    history,
                    metadata: {
                        role: 'lecturer',
                        department: user?.user_metadata?.department,
                        full_name: user?.user_metadata?.full_name,
                    },
                }),
            });
            clearTimeout(tid);
            const data = await res.json();
            store.setMessages(prev => [...prev, {
                id: Date.now() + 'a', sender: 'ai',
                text: data.reply || "I don't have enough information to answer that.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }]);
        } catch (err) {
            const msg = err.name === 'AbortError'
                ? 'Request timed out. Make sure the server is running.'
                : 'Network error. Check your connection and try again.';
            store.setMessages(prev => [...prev, {
                id: Date.now() + 'e', sender: 'ai', text: msg,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }]);
        } finally {
            store.setIsSending(false);
        }
    }, [input, user?.id, user?.user_metadata?.department, user?.user_metadata?.full_name, API_BASE]);

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
        store.setMessages(prev => 
            prev.map(msg => 
                msg.id === editingMessageId 
                    ? { ...msg, text: trimmed }
                    : msg
            )
        );

        // Lecturer chat doesn't persist to database, so just update store
        cancelEdit();
    }, [editingMessageId, editText, cancelEdit]);

    const chips = [
        { icon: <Library size={15} color="#486581" />,  label: 'Library hours' },
        { icon: <BookOpen size={15} color="#486581" />, label: 'Exam policies' },
        { icon: <Users size={15} color="#486581" />,    label: 'Student support' },
        { icon: <Search size={15} color="#486581" />,   label: 'Campus contacts' },
    ];

    const displayMessages = messages || [greeting(firstName)];

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.aiIcon}><Sparkles size={20} color="white" /></View>
                <View>
                    <Text style={styles.headerTitle}>Uni-Assist</Text>
                    <Text style={[styles.headerStatus, isSending && { color: '#fbbf24' }]}>
                        {isSending ? 'Thinking…' : 'Online · Ready to help'}
                    </Text>
                </View>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
            >
                {displayMessages.map(msg => (
                    <View key={msg.id} style={[styles.row, msg.sender === 'user' ? styles.userRow : styles.aiRow]}>
                        {msg.sender === 'ai' && (
                            <View style={styles.aiAvatar}><Sparkles size={12} color="white" /></View>
                        )}
                        <View style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                            {editingMessageId === msg.id && msg.sender === 'user' ? (
                                <>
                                    <TextInput
                                        style={styles.editInput}
                                        value={editText}
                                        onChangeText={setEditText}
                                        multiline
                                        autoFocus
                                    />
                                    <View style={styles.editActions}>
                                        <Pressable style={styles.editActionBtn} onPress={cancelEdit}>
                                            <X size={16} color="white" />
                                        </Pressable>
                                        <Pressable style={styles.editActionBtn} onPress={saveEdit}>
                                            <Check size={16} color="white" />
                                        </Pressable>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {msg.sender === 'user' ? (
                                        <Text style={[styles.msgText, styles.userText]}>{msg.text}</Text>
                                    ) : (
                                        <MarkdownText
                                            text={msg.text}
                                            style={styles.aiText}
                                            dimStyle={styles.aiTextDim}
                                        />
                                    )}
                                    <Text style={styles.ts}>{msg.timestamp}</Text>
                                </>
                            )}
                        </View>
                        {msg.sender === 'user' && editingMessageId !== msg.id && (
                            <Pressable style={styles.editBtn} onPress={() => startEdit(msg)}>
                                <Edit2 size={14} color="#627d98" />
                            </Pressable>
                        )}
                    </View>
                ))}
                {isSending && (
                    <View style={[styles.row, styles.aiRow]}>
                        <View style={styles.aiAvatar}><Sparkles size={12} color="white" /></View>
                        <View style={[styles.bubble, styles.aiBubble, { paddingVertical: 12, width: 60, alignItems: 'center' }]}>
                            <ActivityIndicator size="small" color="#102a43" />
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
                    {chips.map((c, i) => (
                        <Pressable key={`${c.label}-${i}`} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]} onPress={() => setInput(c.label)}>
                            {c.icon}
                            <Text style={styles.chipLabel}>{c.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask anything about GIMPA…"
                        placeholderTextColor="#9fb3c8"
                        value={input}
                        onChangeText={setInput}
                        multiline
                        editable={!isSending}
                    />
                    <Pressable
                        onPress={send}
                        disabled={!input.trim() || isSending}
                        style={({ pressed }) => [
                            styles.sendBtn,
                            (!input.trim() || isSending) && styles.sendDisabled,
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
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24,
    },
    aiIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#102a43', justifyContent: 'center',
        alignItems: 'center', marginRight: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43' },
    headerStatus: { fontSize: 12, color: '#10b981', fontWeight: '600' },
    chatArea: { flex: 1 },
    chatContent: { padding: 24, paddingBottom: 40 },
    row: { flexDirection: 'row', marginBottom: 20, maxWidth: '85%' },
    userRow: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    aiRow: { alignSelf: 'flex-start' },
    aiAvatar: {
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
    aiBubble: { backgroundColor: 'white', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e1e7ec' },
    msgText: { fontSize: 15, lineHeight: 22 },
    userText: { color: 'white' },
    aiText: { color: '#102a43' },
    aiTextDim: { color: '#486581' },
    ts: { fontSize: 10, marginTop: 8, opacity: 0.5, alignSelf: 'flex-end', color: '#486581' },
    inputSection: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e1e7ec', paddingBottom: Platform.OS === 'ios' ? 20 : 12 },
    chipsScroll: { paddingVertical: 12 },
    chipsContent: { paddingHorizontal: 20, gap: 10 },
    chip: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, paddingHorizontal: 14,
        borderRadius: 20, borderWidth: 1, borderColor: '#e1e7ec', backgroundColor: '#f8fafc',
    },
    chipLabel: { marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#486581' },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
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
    sendDisabled: { opacity: 0.5 },
    // Edit message styles
    editBtn: {
        padding: 4,
        marginTop: 4,
        alignSelf: 'flex-start',
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
