import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, ScrollView,
    Pressable, useWindowDimensions
} from 'react-native';
import { MapPin, Navigation as NavIcon } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';

const LOCATIONS = [
    { id: 1,  title: 'Main Administration Block',   category: 'Admin',    distance: '1 min walk',  color: '#64748b', coords: { latitude: 5.6361, longitude: -0.2006 } },
    { id: 2,  title: 'Executive Conference Centre', category: 'Events',   distance: '3 min walk',  color: '#db2777', coords: { latitude: 5.6335, longitude: -0.1986 } },
    { id: 3,  title: 'Business School',             category: 'Academic', distance: '4 min walk',  color: '#92400e', coords: { latitude: 5.6355, longitude: -0.1999 } },
    { id: 4,  title: 'Faculty of Law',              category: 'Academic', distance: '5 min walk',  color: '#7c3aed', coords: { latitude: 5.6338, longitude: -0.2002 } },
    { id: 5,  title: 'School of Technology',        category: 'Academic', distance: '4 min walk',  color: '#0369a1', coords: { latitude: 5.6361, longitude: -0.2006 } },
    { id: 6,  title: 'Hawa Yakubu Hostel',          category: 'Hostel',   distance: '8 min walk',  color: '#8b5cf6', coords: { latitude: 5.6511, longitude: -0.1873 } },
    { id: 7,  title: 'GIMPA Library',               category: 'Study',    distance: '4 min walk',  color: '#3b82f6', coords: { latitude: 5.6359, longitude: -0.2002 } },
    { id: 8,  title: 'GIMPA Junction (Entrance)',   category: 'Gate',     distance: '5 min walk',  color: '#10b981', coords: { latitude: 5.6390, longitude: -0.2094 } },
    { id: 9,  title: 'Greenhill Cafeteria',         category: 'Food',     distance: '3 min walk',  color: '#f97316', coords: { latitude: 5.6352, longitude: -0.1992 } },
    { id: 10, title: 'Campus Clinic',               category: 'Health',   distance: '4 min walk',  color: '#ef4444', coords: { latitude: 5.6345, longitude: -0.2015 } },
    { id: 11, title: 'Graduate Lecture Block',      category: 'Academic', distance: '3 min walk',  color: '#92400e', coords: { latitude: 5.6350, longitude: -0.2000 } },
    // Classroom locations
    { id: 12, title: 'LS 104 - Lecture Hall 104',   category: 'Classroom', distance: '2 min walk',  color: '#3b82f6', coords: { latitude: 5.6355, longitude: -0.2000 } },
    { id: 13, title: 'LS 111 - Lecture Hall 111',   category: 'Classroom', distance: '2 min walk',  color: '#3b82f6', coords: { latitude: 5.6356, longitude: -0.2001 } },
    { id: 14, title: 'GB 210 - Graduate Block 210',  category: 'Classroom', distance: '3 min walk',  color: '#92400e', coords: { latitude: 5.6351, longitude: -0.2001 } },
    { id: 15, title: 'GB 303 - Graduate Block 303',  category: 'Classroom', distance: '3 min walk',  color: '#92400e', coords: { latitude: 5.6352, longitude: -0.2002 } },
    { id: 16, title: 'E 101 - Education Block 101',   category: 'Classroom', distance: '4 min walk',  color: '#f97316', coords: { latitude: 5.6348, longitude: -0.1998 } },
    { id: 17, title: 'E 104 - Education Block 104',   category: 'Classroom', distance: '4 min walk',  color: '#f97316', coords: { latitude: 5.6349, longitude: -0.1999 } },
    { id: 18, title: 'E 107 - Education Block 107',   category: 'Classroom', distance: '4 min walk',  color: '#f97316', coords: { latitude: 5.6350, longitude: -0.2000 } },
    { id: 19, title: 'E 202 - Education Block 202',   category: 'Classroom', distance: '4 min walk',  color: '#f97316', coords: { latitude: 5.6351, longitude: -0.2001 } },
    { id: 20, title: 'L2 GF2 - Level 2 GF2',         category: 'Classroom', distance: '3 min walk',  color: '#8b5cf6', coords: { latitude: 5.6350, longitude: -0.2000 } },
    { id: 21, title: 'Consultancy 1 (CS 101)',       category: 'Classroom', distance: '5 min walk',  color: '#10b981', coords: { latitude: 5.6345, longitude: -0.1995 } },
    { id: 22, title: 'Consultancy 1 (CS 201)',       category: 'Classroom', distance: '5 min walk',  color: '#10b981', coords: { latitude: 5.6346, longitude: -0.1996 } },
    { id: 23, title: 'PSMTP Auditorium',            category: 'Classroom', distance: '4 min walk',  color: '#db2777', coords: { latitude: 5.6347, longitude: -0.1997 } },
];

// ── Build an OpenStreetMap embed URL (free, no API key) ───────────────────────
// Uses the OSM iframe embed with a marker at the selected location.
// For directions we link to OpenStreetMap routing.
function buildMapUrl(loc) {
    const { latitude: lat, longitude: lng } = loc.coords;
    const zoom = 17;
    // OSM embed with marker
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.003},${lat - 0.003},${lng + 0.003},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`;
}

function buildDirectionsUrl(loc) {
    const { latitude: lat, longitude: lng } = loc.coords;
    // Use Google Maps directions which works better with mobile deep linking
    // Opens Google Maps with directions from current location to destination
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAliasMatchTitle(dest, aliasMap) {
    const keys = Object.keys(aliasMap).sort((a, b) => b.length - a.length);
    if (keys.length === 0) return null;
    const aliasRegex = new RegExp(keys.map(escapeRegex).join('|'), 'i');
    const matched = dest.match(aliasRegex);
    if (!matched) return null;
    return aliasMap[matched[0].toLowerCase()] || null;
}

export default function NavigationScreen() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const isDesktop = width >= 1024;
    const params = useLocalSearchParams();
    const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);

    // Deep-link: navigate to a specific location from chat or schedule
    useEffect(() => {
        if (!params.destination) return;
        const dest = params.destination.toLowerCase();

        const buildingMap = {
            'f118': 'Faculty of Law', 'f117': 'Faculty of Law',
            'ecc': 'Executive Conference Centre',
            'admin': 'Main Administration Block',
            'sot': 'School of Technology', 'tech': 'School of Technology',
            'lib': 'GIMPA Library', 'library': 'GIMPA Library',
            'cafe': 'Greenhill Cafeteria', 'cafeteria': 'Greenhill Cafeteria',
            'clinic': 'Campus Clinic', 'hostel': 'Hawa Yakubu Hostel',
            'gate': 'GIMPA Junction (Entrance)', 'entrance': 'GIMPA Junction (Entrance)',
            // Classroom mappings
            'ls 104': 'LS 104 - Lecture Hall 104',
            'ls 111': 'LS 111 - Lecture Hall 111',
            'gb 210': 'GB 210 - Graduate Block 210',
            'gb 303': 'GB 303 - Graduate Block 303',
            'e 101': 'E 101 - Education Block 101',
            'e 104': 'E 104 - Education Block 104',
            'e 107': 'E 107 - Education Block 107',
            'e 202': 'E 202 - Education Block 202',
            'l2 gf2': 'L2 GF2 - Level 2 GF2',
            'consultancy 1 (cs 101)': 'Consultancy 1 (CS 101)',
            'cs 101': 'Consultancy 1 (CS 101)',
            'consultancy 1 (cs 201)': 'Consultancy 1 (CS 201)',
            'cs 201': 'Consultancy 1 (CS 201)',
            'psmtp auditorium': 'PSMTP Auditorium',
        };

        const targetTitle = getAliasMatchTitle(dest, buildingMap);

        const escapedDest = escapeRegex(dest);
        const destRegex = new RegExp(escapedDest, 'i');
        const match = LOCATIONS.find((loc) => {
            if (targetTitle && loc.title === targetTitle) return true;
            if (destRegex.test(loc.title)) return true;
            const titleRegex = new RegExp(escapeRegex(loc.title.toLowerCase()), 'i');
            return titleRegex.test(dest);
        });

        if (match) {
            setSelectedLocation(match);
            // Auto-open directions when navigating from schedule
            if (params.autoNavigate === 'true') {
                const directionsUrl = buildDirectionsUrl(match);
                Linking.openURL(directionsUrl);
            }
        }
    }, [params.destination, params.autoNavigate]);

    const mapUrl = buildMapUrl(selectedLocation);
    const directionsUrl = buildDirectionsUrl(selectedLocation);

    const renderMap = (height = '100%', borderRadius = 20) => (
        <View style={{ height: typeof height === 'number' ? height : undefined, flex: typeof height === 'string' ? 1 : undefined, borderRadius, overflow: 'hidden' }}>
            <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius, display: 'block' }}
                allowFullScreen=""
                loading="lazy"
                title={`Map showing ${selectedLocation.title}`}
            />
            {/* Directions overlay button */}
            <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    position: 'absolute', bottom: 16, right: 16,
                    backgroundColor: '#102a43', color: 'white',
                    padding: '10px 18px', borderRadius: 12,
                    fontWeight: 'bold', fontSize: 13,
                    textDecoration: 'none', display: 'flex',
                    alignItems: 'center', gap: 6,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
            >
                <NavIcon size={14} color="white" aria-label="Get Directions" />
            </a>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.mainLayout, isDesktop && styles.desktopLayout]}>

                {/* ── Location list ─────────────────────────────────────────── */}
                <ScrollView
                    style={styles.listArea}
                    contentContainerStyle={[styles.scrollContent, isMobile && styles.mobileScrollContent]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerSection}>
                        <Text style={[styles.title, isMobile && styles.mobileTitle]}>Campus Navigation</Text>
                        <Text style={styles.subtitle}>Explore the GIMPA Greenhill campus landmarks.</Text>
                    </View>

                    {/* Map shown inline on mobile */}
                    {isMobile && (
                        <View style={styles.mobileMapContainer}>
                            {renderMap(260, 16)}
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>Campus Locations</Text>
                    <View style={styles.locationList}>
                        {LOCATIONS.map(loc => (
                            <Pressable
                                key={loc.id}
                                style={[styles.locationCard, selectedLocation.id === loc.id && styles.selectedCard]}
                                onPress={() => setSelectedLocation(loc)}
                            >
                                <View style={[styles.locationIcon, { backgroundColor: loc.color + '20' }]}>
                                    <MapPin size={20} color={loc.color} />
                                </View>
                                <View style={styles.locationInfo}>
                                    <Text style={styles.locationTitle}>{loc.title}</Text>
                                    <Text style={styles.locationMeta}>{loc.category} · {loc.distance}</Text>
                                </View>
                                <NavIcon size={18} color={selectedLocation.id === loc.id ? '#3b82f6' : '#486581'} />
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>

                {/* ── Desktop map panel ─────────────────────────────────────── */}
                {isDesktop && (
                    <View style={styles.desktopMapSection}>
                        {renderMap('100%', 24)}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    mainLayout: { flex: 1, flexDirection: 'column' },
    desktopLayout: { flexDirection: 'row' },
    listArea: { flex: 1 },
    scrollContent: { padding: 40 },
    mobileScrollContent: { padding: 20 },
    headerSection: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: '900', color: '#102a43' },
    mobileTitle: { fontSize: 24 },
    subtitle: { fontSize: 16, color: '#486581', marginTop: 8 },
    mobileMapContainer: { marginBottom: 32, borderRadius: 16, overflow: 'hidden', height: 260 },
    desktopMapSection: { flex: 1.5, padding: 40, paddingLeft: 0 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#102a43', marginBottom: 16 },
    locationList: { gap: 12 },
    locationCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'white', padding: 16,
        borderRadius: 16, borderWidth: 1, borderColor: '#e1e7ec',
    },
    selectedCard: { borderColor: '#3b82f6', backgroundColor: '#eff6ff', borderWidth: 2 },
    locationIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    locationInfo: { flex: 1 },
    locationTitle: { fontSize: 16, fontWeight: 'bold', color: '#102a43' },
    locationMeta: { fontSize: 13, color: '#627d98', marginTop: 2 },
});
