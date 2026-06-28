import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, Pressable,
    useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { ChevronRight, RefreshCw } from 'lucide-react-native';
import { fetchAnnouncements } from '../../lib/api';

export default function AnnouncementsScreen() {
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
                <Pressable onPress={load} style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}>
                    <RefreshCw size={16} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.retryText}>Retry</Text>
                </Pressable>
            </View>
        );
    } else if (filteredAlerts && filteredAlerts.length > 0) {
        content = (
            <View style={styles.alertsList}>
                {filteredAlerts.map(alert => (
                    <AlertCard key={alert.id} alert={{ ...alert, time: getRelativeTime(alert.created_at) }} />
                ))}
            </View>
        );
    } else {
        content = (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No announcements found in this category.</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerSection}>
                <Text style={[styles.title, isMobile && styles.mobileTitle]}>Announcements</Text>
                <Text style={styles.subtitle}>Stay updated with campus life and alerts.</Text>
            </View>

            {/* Category Filter Chips */}
            <View style={styles.filterContainer}>
                {['All', 'Urgent', 'Event', 'Academic', 'Social', 'General'].map(cat => (
                    <Pressable
                        key={cat}
                        onPress={() => setSelectedCategory(cat)}
                        style={({ pressed }) => [styles.filterChip, selectedCategory === cat && styles.activeFilterChip, pressed && { opacity: 0.85 }]}
                    >
                        <Text style={[styles.filterChipText, selectedCategory === cat && styles.activeFilterChipText]}>
                            {cat}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {content}
        </ScrollView>
    );
}

function AlertCard({ alert }) {
    return (
        <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        >
            <View style={[styles.strip, { backgroundColor: alert.color }]} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.type, { color: alert.color }]}>{alert.type.toUpperCase()}</Text>
                    <Text style={styles.time}>{alert.time}</Text>
                </View>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertDesc}>{alert.content}</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e0" style={styles.chevron} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    scrollArea: { flex: 1 },
    scrollContent: { padding: 40 },
    mobileScrollContent: { padding: 20 },
    headerSection: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: '900', color: '#102a43' },
    mobileTitle: { fontSize: 24 },
    subtitle: { fontSize: 16, color: '#486581', marginTop: 8 },
    filterContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e1e7ec' },
    activeFilterChip: { backgroundColor: '#102a43', borderColor: '#102a43' },
    filterChipText: { fontSize: 14, fontWeight: '600', color: '#486581' },
    activeFilterChipText: { color: 'white' },
    alertsList: { gap: 16 },
    card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e1e7ec', alignItems: 'center' },
    strip: { width: 6, height: '100%' },
    cardContent: { flex: 1, padding: 20 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    type: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    time: { fontSize: 12, color: '#9fb3c8' },
    alertTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43', marginBottom: 4 },
    alertDesc: { fontSize: 14, color: '#627d98', lineHeight: 20 },
    chevron: { marginRight: 15 },
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20 },
    emptyText: { fontSize: 16, color: '#627d98', fontWeight: '500' },
    errorState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5f5', borderRadius: 20, borderWidth: 1, borderColor: '#fecaca' },
    errorText: { fontSize: 15, color: '#991b1b', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#102a43', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
    retryText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
