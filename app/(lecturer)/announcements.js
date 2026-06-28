import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, Pressable,
    useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { ChevronRight, RefreshCw } from 'lucide-react-native';
import { fetchAnnouncements } from '../../lib/api';

export default function LecturerAnnouncementsScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [alerts, setAlerts] = useState(null);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('All');

    const load = useCallback(async () => {
        setAlerts(null);
        setError(null);
        try {
            const { data, error: fetchError } = await fetchAnnouncements();
            if (fetchError) throw fetchError;
            setAlerts(data);
        } catch (e) {
            console.error('[Announcements]', e.message);
            setError('Could not load announcements. Check your connection and try again.');
        }
    }, []);

    useEffect(() => { load(); }, [load]);

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

    const filteredAlerts = selectedCategory === 'All'
        ? alerts
        : alerts.filter(a => a.type === selectedCategory);

    // Render content chosen from state — avoids nested JSX ternaries
    let content = null;
    if (alerts === null && !error) {
        content = <ActivityIndicator size="large" color="#102a43" style={{ marginTop: 40 }} />;
    } else if (error) {
        content = (
            <View style={styles.errorState}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                    onPress={load}
                    style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
                >
                    <RefreshCw size={16} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.retryText}>Retry</Text>
                </Pressable>
            </View>
        );
    } else if (filteredAlerts && filteredAlerts.length > 0) {
        content = filteredAlerts.map((alert) => (
            <Pressable
                key={alert.id}
                style={({ pressed }) => [styles.alertCard, pressed && { opacity: 0.85 }]}
            >
                <View style={[styles.alertTypeBadge, { backgroundColor: alert.color || '#3b82f6' }]}>
                    <Text style={styles.alertTypeText}>{alert.type}</Text>
                </View>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertContent} numberOfLines={3}>
                    {alert.content}
                </Text>
                <View style={styles.alertFooter}>
                    <Text style={styles.alertTime}>{getRelativeTime(alert.created_at)}</Text>
                    <ChevronRight size={16} color="#9fb3c8" />
                </View>
            </Pressable>
        ));
    } else {
        content = (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No announcements found.</Text>
            </View>
        );
    }

    const categories = ['All', 'Urgent', 'Event', 'Academic', 'Social', 'General'];

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerSection}>
                <Text style={[styles.title, isMobile && styles.mobileTitle]}>Announcements</Text>
                <Text style={styles.subtitle}>Campus-wide updates and notifications</Text>
            </View>

            <View style={styles.filterRow}>
                {categories.map((cat) => (
                    <Pressable
                        key={cat}
                        style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                        onPress={() => setSelectedCategory(cat)}
                    >
                        <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                            {cat}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {content}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollArea: { flex: 1 },
    scrollContent: { padding: 40, maxWidth: 800, alignSelf: 'center', width: '100%' },
    mobileScrollContent: { padding: 20 },
    headerSection: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: '900', color: '#102a43' },
    mobileTitle: { fontSize: 24 },
    subtitle: { fontSize: 16, color: '#486581', marginTop: 8 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e1e7ec' },
    filterChipActive: { backgroundColor: '#102a43', borderColor: '#102a43' },
    filterChipText: { fontSize: 13, fontWeight: '600', color: '#486581' },
    filterChipTextActive: { color: 'white' },
    alertCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#e1e7ec' },
    alertTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
    alertTypeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: 'white' },
    alertTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43', marginBottom: 8 },
    alertContent: { fontSize: 15, color: '#334e68', lineHeight: 22, marginBottom: 12 },
    alertFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    alertTime: { fontSize: 13, color: '#9fb3c8', fontWeight: '500' },
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e1e7ec' },
    emptyText: { fontSize: 16, color: '#9fb3c8', fontWeight: '500' },
    errorState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5f5', borderRadius: 20, borderWidth: 1, borderColor: '#fecaca' },
    errorText: { fontSize: 15, color: '#991b1b', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#102a43', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
    retryText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
