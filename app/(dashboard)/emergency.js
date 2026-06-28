import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, ScrollView, Pressable,
    useWindowDimensions, Linking, Alert, ActivityIndicator
} from 'react-native';
import { Phone, Mail, Shield, Zap, AlertTriangle, ChevronRight, Building2, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const FALLBACK_CONTACTS = [
    { id: '1', name: 'GIMPA Security', subtitle: '24/7 Campus Patrol & Assistance', phone: '030-274-6882', email: 'security@gimpa.edu.gh', category: 'Security' },
    { id: '2', name: 'University Medical Centre', subtitle: 'Urgent Care & First Aid', phone: '030-274-6001', email: 'clinic@gimpa.edu.gh', category: 'Medical' },
    { id: '3', name: "Registrar's Office", subtitle: 'Academic records & enrollment', phone: '030-274-6000', email: 'registrar@gimpa.edu.gh', category: 'Academic' },
    { id: '4', name: 'Student Welfare Office', subtitle: 'Counseling & crisis support', phone: '030-274-6830', email: 'welfare@gimpa.edu.gh', category: 'Welfare' },
];

const CATEGORY_ICONS = {
    Security: <Shield size={20} color="#ef4444" />,
    Medical: <Zap size={20} color="#f59e0b" />,
    Academic: <Building2 size={20} color="#3b82f6" />,
    Welfare: <Heart size={20} color="#8b5cf6" />,
};

export default function EmergencyScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const router = useRouter();
    const { isVisitor } = useAuth();

    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isVisitor) {
            router.replace('/(dashboard)');
            return;
        }
        fetchContacts();
    }, [isVisitor, router]);

    async function fetchContacts() {
        setLoading(true);
        const { data, error } = await supabase
            .from('emergency_contacts')
            .select('*')
            .order('sort_order');

        if (!error && data?.length > 0) {
            setContacts(data);
        } else {
            setContacts(FALLBACK_CONTACTS);
        }
        setLoading(false);
    }

    function handleCall(phoneNumber) {
        const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
        const url = `tel:${cleanNumber}`;
        Linking.canOpenURL(url)
            .then((supported) => {
                if (!supported) {
                    Alert.alert('Calling Not Supported', `Dial manually: ${phoneNumber}`);
                } else {
                    return Linking.openURL(url);
                }
            })
            .catch(() => Alert.alert('Error', 'Unable to initiate phone call.'));
    }

    function handleEmail(email) {
        if (!email) return;
        const url = `mailto:${email}`;
        Linking.canOpenURL(url)
            .then((supported) => {
                if (!supported) {
                    Alert.alert('Email Not Available', email);
                } else {
                    return Linking.openURL(url);
                }
            })
            .catch(() => Alert.alert('Error', 'Unable to open email client.'));
    }

    if (isVisitor) return null;

    const securityPhone = contacts[0]?.phone || '030-274-6882';

    return (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerSection}>
                <Text style={[styles.title, isMobile && styles.mobileTitle]}>Emergency Info</Text>
                <Text style={styles.subtitle}>Critical contacts and safety procedures.</Text>
            </View>

            <View style={styles.urgentAlert}>
                <AlertTriangle size={24} color="#ef4444" />
                <View style={styles.urgentTextContainer}>
                    <Text style={styles.urgentTitle}>Quick Emergency Call</Text>
                    <Text style={styles.urgentDesc}>Tap SOS to contact campus security immediately.</Text>
                </View>
                <Pressable style={styles.sosButton} onPress={() => handleCall(securityPhone)}>
                    <Text style={styles.sosText}>SOS</Text>
                </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Essential Contacts</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#102a43" style={{ marginVertical: 24 }} />
            ) : (
                <View style={styles.contactList}>
                    {contacts.map((contact) => (
                        <ContactItem
                            key={contact.id}
                            icon={CATEGORY_ICONS[contact.category] || <Phone size={20} color="#3b82f6" />}
                            title={contact.name}
                            subtitle={contact.subtitle}
                            phone={contact.phone}
                            email={contact.email}
                            onCall={() => handleCall(contact.phone)}
                            onEmail={() => handleEmail(contact.email)}
                        />
                    ))}
                </View>
            )}

            <Text style={styles.sectionTitle}>Safety Procedures</Text>
            <View style={styles.procedureList}>
                <ProcedureCard title="Fire Evacuation" desc="Proceed to the nearest exit and report to the Assembly Point at the Administration Block parking area." />
                <ProcedureCard title="Medical Emergency" desc="Call GIMPA Security immediately. Clear the area and do not move the person unless necessary." />
            </View>
        </ScrollView>
    );
}

function ContactItem({ icon, title, subtitle, phone, email, onCall, onEmail }) {
    return (
        <View style={styles.contactCard}>
            <View style={styles.contactIcon}>{icon}</View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{title}</Text>
                <Text style={styles.contactSubtitle}>{subtitle}</Text>
                <Text style={styles.phoneText}>{phone}</Text>
            </View>
            <View style={styles.actionCol}>
                <Pressable style={styles.actionBtn} onPress={onCall}>
                    <Phone size={16} color="white" />
                    <Text style={styles.actionBtnText}>Call</Text>
                </Pressable>
                {email ? (
                    <Pressable style={[styles.actionBtn, styles.emailBtn]} onPress={onEmail}>
                        <Mail size={16} color="white" />
                        <Text style={styles.actionBtnText}>Email</Text>
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}

function ProcedureCard({ title, desc }) {
    return (
        <Pressable style={styles.procedureCard}>
            <Text style={styles.procedureTitle}>{title}</Text>
            <Text style={styles.procedureDesc}>{desc}</Text>
            <ChevronRight size={18} color="#cbd5e0" style={{ marginTop: 12, alignSelf: 'flex-end' }} />
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
    urgentAlert: {
        backgroundColor: '#fee2e2', padding: 24, borderRadius: 24,
        flexDirection: 'row', alignItems: 'center', marginBottom: 40,
        borderWidth: 1, borderColor: '#fecaca',
    },
    urgentTextContainer: { flex: 1, marginLeft: 16 },
    urgentTitle: { fontSize: 18, fontWeight: 'bold', color: '#991b1b' },
    urgentDesc: { fontSize: 14, color: '#b91c1c', marginTop: 4 },
    sosButton: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center',
    },
    sosText: { color: 'white', fontWeight: '900' },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#102a43', marginBottom: 20, marginTop: 10 },
    contactList: { gap: 12, marginBottom: 40 },
    contactCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
        padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e1e7ec',
    },
    contactIcon: {
        width: 40, height: 40, backgroundColor: '#f0f4f8', borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    contactInfo: { flex: 1 },
    contactTitle: { fontSize: 16, fontWeight: 'bold', color: '#102a43' },
    contactSubtitle: { fontSize: 13, color: '#627d98' },
    phoneText: { fontSize: 13, fontWeight: '600', color: '#ef4444', marginTop: 4 },
    actionCol: { gap: 8, marginLeft: 8 },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444',
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, gap: 6,
    },
    emailBtn: { backgroundColor: '#3b82f6' },
    actionBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
    procedureList: { flexDirection: 'row', gap: 16 },
    procedureCard: {
        flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 20,
        borderWidth: 1, borderColor: '#e1e7ec',
    },
    procedureTitle: { fontSize: 16, fontWeight: 'bold', color: '#102a43', marginBottom: 8 },
    procedureDesc: { fontSize: 13, color: '#627d98', lineHeight: 18 },
});
