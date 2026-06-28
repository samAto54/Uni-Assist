import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView,
    useWindowDimensions, ActivityIndicator, Pressable,
} from 'react-native';
import { Calendar, Clock, MapPin, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { fetchStudentTimetable } from '../../lib/api';

export default function TimetableScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { user, isVisitor } = useAuth();
    const router = useRouter();

    const [timetableData, setTimetableData] = useState(null);
    const [error, setError]                 = useState(null);

    // Visitor guard
    useEffect(() => {
        if (isVisitor) router.replace('/(dashboard)');
    }, [isVisitor, router]);

    const metadata = user?.user_metadata || null;
    const load = useCallback(async () => {
        if (!user || isVisitor) return;
        setTimetableData(null);
        setError(null);
        try {
            const { data, error: fetchError } = await fetchStudentTimetable(
                user.id,
                metadata,
            );
            if (fetchError) throw fetchError;
            setTimetableData(data);
        } catch (e) {
            console.error('[Timetable]', e.message);
            setError('Could not load your timetable. Check your connection and try again.');
        }
    }, [user, metadata, isVisitor]);

    useEffect(() => { load(); }, [load]);

    if (isVisitor) return null;

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerSection}>
                <Text style={[styles.title, isMobile && styles.mobileTitle]}>My Timetable</Text>
                <Text style={styles.subtitle}>Spring Semester 2026</Text>
            </View>

            {timetableData === null && !error ? (
                <ActivityIndicator size="large" color="#102a43" style={{ marginTop: 40 }} />
            ) : error ? (
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
            ) : timetableData && timetableData.length > 0 ? (
                <View style={styles.timetableContainer}>
                    {timetableData.map((dayGroup) => (
                        <View key={dayGroup.day} style={styles.dayGroup}>
                            <View style={styles.dayHeader}>
                                <Calendar size={20} color="#102a43" />
                                <Text style={styles.dayTitle}>{dayGroup.day}</Text>
                            </View>
                            <View style={styles.classesList}>
                                {dayGroup.classes.map((cls) => (
                                    <View key={cls.id ?? `${cls.course}-${cls.time}`} style={styles.classCard}>
                                        <View style={styles.timeSection}>
                                            <Clock size={16} color="#627d98" style={{ marginRight: 6 }} />
                                            <Text style={styles.timeText}>{cls.time}</Text>
                                        </View>
                                        <View style={styles.classInfo}>
                                            <Text style={styles.courseName}>{cls.course}</Text>
                                            <View style={styles.locationSection}>
                                                <MapPin size={14} color="#9fb3c8" style={{ marginRight: 4 }} />
                                                <Text style={styles.locationText}>{cls.location}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No classes scheduled for this week yet.</Text>
                </View>
            )}
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
    timetableContainer: { gap: 30 },
    dayGroup: {},
    dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#f0f4f8' },
    dayTitle: { fontSize: 20, fontWeight: 'bold', color: '#102a43', marginLeft: 10 },
    classesList: { gap: 12 },
    classCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#102a43', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#e1e7ec', flexWrap: 'wrap', gap: 10 },
    timeSection: { width: 120, flexDirection: 'row', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f0f4f8', paddingRight: 10 },
    timeText: { fontSize: 14, fontWeight: 'bold', color: '#486581' },
    classInfo: { flex: 1, minWidth: 200 },
    courseName: { fontSize: 16, fontWeight: 'bold', color: '#102a43', marginBottom: 6 },
    locationSection: { flexDirection: 'row', alignItems: 'center' },
    locationText: { fontSize: 13, color: '#627d98' },
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20 },
    emptyText: { fontSize: 16, color: '#627d98', fontWeight: '500' },
    errorState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5f5', borderRadius: 20, borderWidth: 1, borderColor: '#fecaca' },
    errorText: { fontSize: 15, color: '#991b1b', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#102a43', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
    retryText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
