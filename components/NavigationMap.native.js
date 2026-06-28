import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, Pressable,
    TextInput, Keyboard, Platform, ActivityIndicator,
} from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat } from 'react-native-reanimated';
import MapView, { Marker, Callout, Polyline, PROVIDER_GOOGLE, Animated as MapAnimated } from 'react-native-maps';
import {
    MapPin, Search, Navigation as NavIcon, X,
    Map as MapIcon, Book, Building2, Utensils,
    Bed, Briefcase, GraduationCap, Locate, ArrowUp, ChevronRight,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { GIMPA_CENTER, isWithinCampus } from '../lib/geospatial';

// ── API keys ──────────────────────────────────────────────────────────────────
const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || '';

const CAMPUS_REGION = {
    ...GIMPA_CENTER,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
};

const LOCATIONS = [
    { id: 1,  title: 'Main Administration Block',   category: 'Admin',    lat: 5.6361000, lng: -0.2006000, color: '#64748b', icon: Building2 },
    { id: 2,  title: 'Executive Conference Centre', category: 'Events',   lat: 5.6335322, lng: -0.1986020, color: '#db2777', icon: Briefcase },
    { id: 3,  title: 'Business School',             category: 'Academic', lat: 5.6354523, lng: -0.1998845, color: '#92400e', icon: GraduationCap },
    { id: 4,  title: 'Faculty of Law',              category: 'Academic', lat: 5.6338090, lng: -0.2002380, color: '#92400e', icon: GraduationCap },
    { id: 5,  title: 'School of Technology',        category: 'Academic', lat: 5.6361110, lng: -0.2005550, color: '#92400e', icon: GraduationCap },
    { id: 6,  title: 'Hawa Yakubu Hostel',          category: 'Hostel',   lat: 5.6511000, lng: -0.1873000, color: '#8b5cf6', icon: Bed },
    { id: 7,  title: 'GIMPA Library',               category: 'Study',    lat: 5.6358784, lng: -0.2002184, color: '#3b82f6', icon: Book },
    { id: 8,  title: 'GIMPA Junction (Entrance)',   category: 'Gate',     lat: 5.6390267, lng: -0.2093658, color: '#10b981', icon: MapPin },
    { id: 9,  title: 'Greenhill Cafeteria',         category: 'Food',     lat: 5.6352000, lng: -0.1992000, color: '#f97316', icon: Utensils },
    { id: 10, title: 'Campus Clinic',               category: 'Health',   lat: 5.6345000, lng: -0.2015000, color: '#ef4444', icon: Building2 },
    { id: 11, title: 'Graduate Lecture Block',      category: 'Academic', lat: 5.6350000, lng: -0.2000000, color: '#92400e', icon: GraduationCap },
];

// ── Haversine straight-line distance (metres) ─────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Simple 2D Kalman-like low-pass filter for latitude/longitude
class SimpleKalman {
    constructor({ R = 4, Q = 0.00002 } = {}) {
        this.R = R; // measurement noise (approx metres)
        this.Q = Q; // process noise
        this.x = null; // state { lat, lon }
        this.P = 1; // estimate covariance
    }

    setState(lat, lon) {
        this.x = { lat, lon };
        this.P = 1;
    }

    filter(lat, lon) {
        if (!this.x) {
            this.setState(lat, lon);
            return { latitude: lat, longitude: lon };
        }
        // Predict (we use a simple constant model so prediction step is identity)
        this.P += this.Q;

        // Update for latitude
        const K = this.P / (this.P + this.R);
        this.x.lat = this.x.lat + K * (lat - this.x.lat);
        this.x.lon = this.x.lon + K * (lon - this.x.lon);
        this.P = (1 - K) * this.P;

        return { latitude: this.x.lat, longitude: this.x.lon };
    }
}

// ── Compass bearing label for fallback instruction ────────────────────────────
function getBearing(origin, dest) {
    const dLon = (dest.longitude - origin.longitude) * Math.PI / 180;
    const lat1 = origin.latitude * Math.PI / 180;
    const lat2 = dest.latitude * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    if (deg < 22.5 || deg >= 337.5) return 'Head north';
    if (deg < 67.5)  return 'Head northeast';
    if (deg < 112.5) return 'Head east';
    if (deg < 157.5) return 'Head southeast';
    if (deg < 202.5) return 'Head south';
    if (deg < 247.5) return 'Head southwest';
    if (deg < 292.5) return 'Head west';
    return 'Head northwest';
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAliasMatchTitle(dest, aliasMap) {
    const keys = Object.keys(aliasMap).sort((a, b) => b.length - a.length);
    if (!keys.length) return null;
    const aliasRegex = new RegExp(keys.map(escapeRegex).join('|'), 'i');
    const matched = dest.match(aliasRegex);
    if (!matched) return null;
    return aliasMap[matched[0].toLowerCase()] || null;
}

// ── Geoapify Routing API ──────────────────────────────────────────────────────
// Returns { coordinates, distance_km, duration_min, steps[] } or null on error.
// API: https://api.geoapify.com/v1/routing?waypoints=lat,lon|lat,lon&mode=walk&details=instruction_details&apiKey=KEY
async function fetchGeoapifyRoute(origin, dest) {
    if (!GEOAPIFY_KEY) return null;
    const url =
        `https://api.geoapify.com/v1/routing` +
        `?waypoints=${origin.latitude},${origin.longitude}|${dest.latitude},${dest.longitude}` +
        `&mode=walk` +
        `&details=instruction_details` +
        `&units=metric` +
        `&apiKey=${GEOAPIFY_KEY}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Geoapify ${res.status}`);
        const json = await res.json();
        const feature = json?.features?.[0];
        if (!feature) return null;

        const props = feature.properties;
        const legs  = props?.legs ?? [];

        // Flatten all step coordinates into a polyline array
        const coordinates = [];
        for (const leg of legs) {
            for (const step of (leg.steps ?? [])) {
                for (const [lon, lat] of (step.geometry?.coordinates ?? [])) {
                    coordinates.push({ latitude: lat, longitude: lon });
                }
            }
        }
        // Fallback: use the feature geometry if steps had no coords
        if (coordinates.length === 0) {
            for (const [lon, lat] of (feature.geometry?.coordinates?.[0] ?? [])) {
                coordinates.push({ latitude: lat, longitude: lon });
            }
        }

        // First instruction text
        const firstStep = legs?.[0]?.steps?.[0];
        const instruction = firstStep?.instruction?.text ?? null;

        // All step instructions for live updates
        const steps = [];
        for (const leg of legs) {
            for (const step of (leg.steps ?? [])) {
                if (step.instruction?.text) {
                    steps.push({
                        text: step.instruction.text,
                        distance: step.distance ?? 0,
                        // last coordinate of this step = the waypoint to reach
                        point: step.geometry?.coordinates?.slice(-1)?.[0]
                            ? {
                                latitude:  step.geometry.coordinates.slice(-1)[0][1],
                                longitude: step.geometry.coordinates.slice(-1)[0][0],
                              }
                            : null,
                    });
                }
            }
        }

        return {
            coordinates,
            distance_km:   (props.distance ?? 0) / 1000,
            duration_min:  (props.time ?? 0) / 60,
            instruction,
            steps,
        };
    } catch (e) {
        console.warn('[Geoapify] routing error:', e.message);
        return null;
    }
}

// ── Bearing in degrees between two coords (for avatar rotation) ──────────────
function bearingDeg(from, to) {
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const lat1 = from.latitude  * Math.PI / 180;
    const lat2 = to.latitude    * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ── Animated avatar marker shown on the route while navigating ───────────────
function AvatarMarker({ coordinate, heading, tracksView = true }) {
    // Reanimated shared value for pulse
    const pulse = useSharedValue(1);

    useEffect(() => {
        // Animate pulse between 1 -> 1.5 -> 1 in a loop
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.5, { duration: 1000 }),
                withTiming(1,   { duration: 1000 })
            ),
            -1,
            false
        );
        // no cleanup needed for shared value loop
    }, [pulse]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const MapAnim = MapAnimated || MapView.Animated;
    const MarkerComp = (MapAnim && MapAnim.Marker) ? MapAnim.Marker : Marker;

    return (
        <MarkerComp
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 0.68 }}
            flat
            tracksViewChanges={tracksView}
        >
            <View style={styles.avatarContainer}>
                {/* Pulse ring behind the avatar (Reanimated) */}
                <Reanimated.View style={[styles.avatarPulse, pulseStyle]} />
                {/* Arrow circle — rotated to face heading */}
                <View style={[styles.avatarOuter, { transform: [{ rotate: `${Math.round(heading)}deg` }] }]}>
                    <View style={styles.avatarArrow} />
                </View>
            </View>
        </MarkerComp>
    );
}

export default function NavigationScreen() {
    const mapRef  = useRef(null);
    const params  = useLocalSearchParams();

    // ── State ─────────────────────────────────────────────────────────────────
    const [selected,       setSelected]       = useState(null);
    const [routeCoords,    setRouteCoords]    = useState([]);   // polyline points
    const [routeSteps,     setRouteSteps]     = useState([]);   // turn-by-turn steps
    const [stepIndex,      setStepIndex]      = useState(0);    // current step
    const [origin,         setOrigin]         = useState(null);
    const [destination,    setDestination]    = useState(null);
    const [isRouting,      setIsRouting]      = useState(false);
    const [routeLoading,   setRouteLoading]   = useState(false);
    const [routeInfo,      setRouteInfo]      = useState(null);
    const [instruction,    setInstruction]    = useState(null);
    const [userLocation,   setUserLocation]   = useState(null);
    const [isFollowing,    setIsFollowing]    = useState(true);
    const [mapType, setMapType] = useState('standard');
    const [searchQuery,    setSearchQuery]    = useState('');
    const [locationError,  setLocationError]  = useState(null);
    const [hasPermission,  setHasPermission]  = useState(null);
    const [avatarHeading,  setAvatarHeading]  = useState(0); // degrees, 0 = north

    // ── Refs (avoid stale closures in async callbacks) ────────────────────────
    const pendingDestRef  = useRef(null);
    const isRoutingRef    = useRef(false);
    const isFollowingRef  = useRef(true);
    const userLocationRef = useRef(null);
    const routeStepsRef   = useRef([]);
    const stepIndexRef    = useRef(0);
    // Animated marker region for smooth avatar movement
    const markerRegionRef = useRef(null);
    const animatedMarkerRef = useRef(null);
    const headingSubRef = useRef(null);
    const stationaryRef = useRef(false);
    // Kalman filter for smoothing and gating refs
    const kalmanRef = useRef(null);
    const consecMovementRef = useRef(0);
    const tracksTimeoutRef = useRef(null);
    const [avatarTracksViewChanges, setAvatarTracksViewChanges] = useState(false);

    useEffect(() => { isRoutingRef.current   = isRouting;    }, [isRouting]);
    useEffect(() => { isFollowingRef.current = isFollowing;  }, [isFollowing]);
    useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
    useEffect(() => { routeStepsRef.current  = routeSteps;   }, [routeSteps]);
    useEffect(() => { stepIndexRef.current   = stepIndex;    }, [stepIndex]);

    // ── Location tracking ─────────────────────────────────────────────────────
    useEffect(() => {
        let sub = null;
        let headingSub = null;
        let timeoutId = null;

        async function start() {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                setHasPermission(status === 'granted');
                if (status !== 'granted') {
                    setLocationError('Location permission denied. Showing campus map without your position.');
                    return;
                }

                const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const coords  = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };

                if (MapAnimated && MapAnimated.Region) {
                    try {
                        markerRegionRef.current = new MapAnimated.Region({
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                            latitudeDelta: 0,
                            longitudeDelta: 0,
                        });
                    } catch (e) {
                        markerRegionRef.current = null;
                    }
                }

                setUserLocation(coords);
                // Initialize Kalman filter with first fix
                try {
                    kalmanRef.current = new SimpleKalman({ R: 4, Q: 0.00002 });
                    kalmanRef.current.setState(coords.latitude, coords.longitude);
                } catch (e) {
                    kalmanRef.current = null;
                }
                if (isFollowingRef.current) {
                    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 800);
                }

                if (pendingDestRef.current) {
                    const pending = pendingDestRef.current;
                    pendingDestRef.current = null;
                    timeoutId = setTimeout(() => startRoutingToLoc(pending), 500);
                }

                sub = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1, timeInterval: 1000 },
                    (loc) => {
                        const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                        const prev = userLocationRef.current;
                        const movement = prev ? haversine(prev.latitude, prev.longitude, c.latitude, c.longitude) : Infinity;

                        const SUPPRESS_MOVEMENT_THRESHOLD = 6.0; // metres
                        const REQUIRED_CONSECUTIVE = 2; // require N successive > threshold updates

                        // Heading: prefer device heading when available
                        const deviceHeading = loc.coords.heading;
                        if (deviceHeading != null && deviceHeading >= 0) {
                            setAvatarHeading(deviceHeading);
                        } else if (prev && movement >= 1.0) {
                            setAvatarHeading(bearingDeg(prev, c));
                        }

                        // Gating: require multiple consecutive above-threshold movements
                        if (prev) {
                            if (movement < SUPPRESS_MOVEMENT_THRESHOLD) {
                                consecMovementRef.current = 0;
                                stationaryRef.current = true;
                                return; // ignore tiny jitter
                            } else {
                                consecMovementRef.current = (consecMovementRef.current || 0) + 1;
                                if (consecMovementRef.current < REQUIRED_CONSECUTIVE) {
                                    // wait for another confirming sample
                                    return;
                                }
                                stationaryRef.current = false;
                            }
                        }

                        // Apply Kalman filtering if available
                        let filtered = c;
                        try {
                            if (kalmanRef.current) {
                                filtered = kalmanRef.current.filter(c.latitude, c.longitude);
                            }
                        } catch (e) {
                            filtered = c;
                        }

                        const targetPos = filtered;

                        // Toggle tracksViewChanges briefly to reduce redraw overhead
                        try {
                            setAvatarTracksViewChanges(true);
                            if (tracksTimeoutRef.current) clearTimeout(tracksTimeoutRef.current);
                            tracksTimeoutRef.current = setTimeout(() => setAvatarTracksViewChanges(false), 800);
                        } catch (e) {
                            // ignore
                        }

                        if (markerRegionRef.current && typeof markerRegionRef.current.timing === 'function') {
                            try {
                                markerRegionRef.current.timing({ latitude: targetPos.latitude, longitude: targetPos.longitude, duration: 600 }).start();
                            } catch (e) {
                                setUserLocation(targetPos);
                            }
                        } else {
                            setUserLocation(targetPos);
                        }

                        // Camera following logic uses the raw coordinate to avoid small latency in camera
                        if (isFollowingRef.current && !isRoutingRef.current) {
                            mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 400);
                        }

                        if (isRoutingRef.current && isFollowingRef.current) {
                            mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.003, longitudeDelta: 0.003 }, 600);
                        }

                        // Live step advancement
                        if (isRoutingRef.current) {
                            const steps = routeStepsRef.current;
                            const idx = stepIndexRef.current;
                            if (steps.length > 0 && idx < steps.length - 1) {
                                const next = steps[idx + 1];
                                if (next?.point) {
                                    const dist = haversine(c.latitude, c.longitude, next.point.latitude, next.point.longitude);
                                    if (dist < 20) {
                                        const newIdx = idx + 1;
                                        setStepIndex(newIdx);
                                        setInstruction(steps[newIdx].text);
                                    }
                                }
                            }
                        }
                    }
                );

                // Heading subscription for devices that provide trueHeading
                try {
                    headingSub = await Location.watchHeadingAsync((h) => {
                        if (h && typeof h.trueHeading === 'number') setAvatarHeading(h.trueHeading);
                    });
                } catch (e) {
                    // ignore if unavailable
                }

            } catch (err) {
                console.error('[Nav] tracking error:', err.message);
                setLocationError('Could not get your location. Showing campus map.');
            }
        }

        start();
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            sub?.remove();
            headingSub?.remove?.();
            if (tracksTimeoutRef.current) clearTimeout(tracksTimeoutRef.current);
            tracksTimeoutRef.current = null;
        };
    }, []);

    // ── Deep-link routing (from chat "Navigate to X" button)
    useEffect(() => {
        if (!params.destination) return;
        let destTimeout = null;
        const dest = String(params.destination).toLowerCase();
        const aliasMap = {
            'library': 'GIMPA Library', 'gimpa library': 'GIMPA Library',
            'main administration block': 'Main Administration Block',
            'administration block': 'Main Administration Block', 'admin': 'Main Administration Block',
            'executive conference centre': 'Executive Conference Centre', 'ecc': 'Executive Conference Centre',
            'business school': 'Business School',
            'faculty of law': 'Faculty of Law', 'law': 'Faculty of Law',
            'school of technology': 'School of Technology', 'sot': 'School of Technology',
            'hawa yakubu hostel': 'Hawa Yakubu Hostel', 'hostel': 'Hawa Yakubu Hostel',
            'gimpa junction': 'GIMPA Junction (Entrance)', 'main gate': 'GIMPA Junction (Entrance)',
            'greenhill cafeteria': 'Greenhill Cafeteria', 'cafeteria': 'Greenhill Cafeteria',
            'campus clinic': 'Campus Clinic', 'clinic': 'Campus Clinic',
            'graduate lecture block': 'Graduate Lecture Block',
        };
        const targetTitle = getAliasMatchTitle(dest, aliasMap);
        const escapedDest = escapeRegex(dest);
        const destRegex = new RegExp(escapedDest, 'i');
        const match = LOCATIONS.find((loc) => {
            if (targetTitle && loc.title === targetTitle) return true;
            if (destRegex.test(loc.title)) return true;
            const titleRegex = new RegExp(escapeRegex(loc.title.toLowerCase()), 'i');
            return titleRegex.test(dest);
        });
        if (!match) return;
        if (userLocationRef.current) {
            destTimeout = setTimeout(() => startRoutingToLoc(match), 300);
        } else {
            pendingDestRef.current = match;
        }
        return () => { if (destTimeout) clearTimeout(destTimeout); };
    }, [params.destination]);

    const startRoutingToLoc = useCallback(async (loc) => {
        const liveLoc = userLocationRef.current;
        const org = (liveLoc && isWithinCampus(liveLoc.latitude, liveLoc.longitude))
            ? { latitude: liveLoc.latitude, longitude: liveLoc.longitude }
            : { latitude: 5.6390, longitude: -0.2093 }; // fallback: GIMPA gate
        const dst = { latitude: loc.lat, longitude: loc.lng };

        setSelected(loc);
        setOrigin(org);
        setDestination(dst);
        setIsRouting(true);
        setIsFollowing(false);
        setRouteCoords([]);
        setRouteInfo(null);
        setRouteSteps([]);
        setStepIndex(0);
        setInstruction(getBearing(org, dst)); // immediate compass fallback
        setRouteLoading(true);

        // Fit map to show both points while route loads
        setTimeout(() => {
            mapRef.current?.fitToCoordinates([org, dst], {
                edgePadding: { top: 160, right: 60, bottom: 300, left: 60 }, animated: true,
            });
        }, 200);

        // Fetch real walking route from Geoapify
        const route = await fetchGeoapifyRoute(org, dst);
        setRouteLoading(false);

        if (route && route.coordinates.length > 1) {
            setRouteCoords(route.coordinates);
            setRouteInfo({ distance: route.distance_km, duration: route.duration_min });
            setRouteSteps(route.steps);
            setStepIndex(0);
            if (route.instruction) setInstruction(route.instruction);
            // Fit to actual route shape
            mapRef.current?.fitToCoordinates(route.coordinates, {
                edgePadding: { top: 160, right: 60, bottom: 300, left: 60 },
            });
        } else {
            // Geoapify failed — straight-line fallback
            const dist = haversine(org.latitude, org.longitude, dst.latitude, dst.longitude) / 1000;
            setRouteCoords([org, dst]);
            setRouteInfo({ distance: dist, duration: Math.round(dist * 12) });
        }
    }, []);

    // ── Re-centre camera on user ──────────────────────────────────────────────
    const centreOnUser = useCallback(() => {
        const loc = userLocationRef.current;
        if (loc) {
            mapRef.current?.animateToRegion({ ...loc, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 600);
            setIsFollowing(true);
        } else {
            mapRef.current?.animateToRegion(CAMPUS_REGION, 600);
        }
    }, []);

    // ── Exit navigation ───────────────────────────────────────────────────────
    const exitNavigation = useCallback(() => {
        setSelected(null);
        setDestination(null);
        setOrigin(null);
        setIsRouting(false);
        setRouteCoords([]);
        setRouteInfo(null);
        setRouteSteps([]);
        setStepIndex(0);
        setInstruction(null);
        setRouteLoading(false);
        setSearchQuery('');
        mapRef.current?.animateToRegion(CAMPUS_REGION, 600);
    }, []);

    const filteredLocations = searchQuery.length > 1
        ? LOCATIONS.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const arrivalTime = routeInfo
        ? new Date(Date.now() + routeInfo.duration * 60000)
            .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>

            {/* Full-screen map — mapPadding accounts for UI overlays (fix #5) */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                mapType={mapType}
                initialRegion={CAMPUS_REGION}
                showsUserLocation={hasPermission === true && !isRouting}
                followsUserLocation={isFollowing && !isRouting}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={true}
                pitchEnabled={true}
                rotateEnabled={true}
                userLocationAnnotationTitle=""
                onPanDrag={() => setIsFollowing(false)}
                mapPadding={{
                    top:    isRouting ? 100 : 70,
                    right:  20,
                    bottom: isRouting ? 220 : 100,
                    left:   20,
                }}
            >
                {/* Geoapify route polyline — only shown when coords exist (fix #6) */}
                {isRouting && routeCoords.length > 0 && (
                    <Polyline
                        coordinates={routeCoords}
                        strokeWidth={8}
                        strokeColor="#1e90ff"
                        lineCap="round"
                        lineJoin="round"
                        lineDashPattern={routeInfo && routeCoords.length === 2 ? [10, 6] : undefined}
                    />
                )}

                {/* Animated avatar — replaces the default blue dot while routing */}
                {isRouting && (
                    markerRegionRef.current ? (
                        <AvatarMarker
                            coordinate={markerRegionRef.current}
                            heading={avatarHeading}
                            tracksView={avatarTracksViewChanges}
                        />
                    ) : (userLocation && (
                        <AvatarMarker
                            coordinate={userLocation}
                            heading={avatarHeading}
                            tracksView={avatarTracksViewChanges}
                        />
                    ))
                )}

                {/* Campus markers */}
                {LOCATIONS.map(loc => {
                    const isSelected = selected?.id === loc.id;
                    const IconComp   = loc.icon || MapPin;
                    return (
                        <Marker
                            key={loc.id}
                            coordinate={{ latitude: loc.lat, longitude: loc.lng }}
                            onPress={() => { setSelected(loc); setIsFollowing(false); }}
                            tracksViewChanges={false}
                        >
                            <View style={[styles.pin, { backgroundColor: loc.color }, isSelected && styles.pinSelected]}>
                                <IconComp size={isSelected ? 18 : 13} color="white" />
                            </View>
                            <Callout tooltip onPress={() => startRoutingToLoc(loc)}>
                                <View style={styles.callout}>
                                    <Text style={styles.calloutTitle}>{loc.title}</Text>
                                    <Text style={styles.calloutMeta}>{loc.category}</Text>
                                    <Text style={styles.calloutAction}>Tap to navigate →</Text>
                                </View>
                            </Callout>
                        </Marker>
                    );
                })}
            </MapView>

            {/* ── Green instruction banner (shown while routing) ────────────── */}
            {isRouting && instruction && (
                <View style={styles.instructionBanner}>
                    <View style={styles.instructionIcon}>
                        <ArrowUp size={26} color="white" />
                    </View>
                    <Text style={styles.instructionText} numberOfLines={2}>{instruction}</Text>
                </View>
            )}

            {/* ── Search bar (hidden while routing) ────────────────────────── */}
            {!isRouting && (
                <View style={styles.searchOverlay}>
                    <View style={styles.searchCard}>
                        <Search size={18} color="#64748b" style={{ marginLeft: 14 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search campus locations..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#94a3b8"
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')} style={{ marginRight: 12 }}>
                                <X size={18} color="#64748b" />
                            </Pressable>
                        )}
                    </View>
                    {filteredLocations.length > 0 && (
                        <View style={styles.suggestions}>
                            {filteredLocations.map(loc => (
                                <Pressable
                                    key={loc.id}
                                    style={styles.suggestionItem}
                                    onPress={() => { setSearchQuery(''); Keyboard.dismiss(); startRoutingToLoc(loc); }}
                                >
                                    <View style={[styles.suggestionDot, { backgroundColor: loc.color }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.suggestionTitle}>{loc.title}</Text>
                                        <Text style={styles.suggestionMeta}>{loc.category}</Text>
                                    </View>
                                    <ChevronRight size={16} color="#94a3b8" />
                                </Pressable>
                            ))}
                        </View>
                    )}
                    {locationError && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorBannerText}>{locationError}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* ── Right-side circular FABs ──────────────────────────────────── */}
                <View style={[styles.fabColumn, isRouting && styles.fabColumnRouting]}>
                <Pressable
                    style={[styles.fab, isFollowing && isRouting && styles.fabActive]}
                    onPress={centreOnUser}
                >
                    <Locate size={22} color={isFollowing && isRouting ? 'white' : '#1e293b'} />
                </Pressable>
                {/* Toggle map view: standard / satellite */}
                <Pressable
                    style={[styles.fab, mapType === 'satellite' && styles.fabActive]}
                    onPress={() => setMapType(prev => prev === 'standard' ? 'satellite' : 'standard')}
                >
                    <MapIcon size={20} color={mapType === 'satellite' ? 'white' : '#1e293b'} />
                </Pressable>
                {!isRouting && (
                    <Pressable
                        style={styles.fab}
                        onPress={() => mapRef.current?.animateToRegion(CAMPUS_REGION, 600)}
                    >
                        <MapIcon size={22} color="#1e293b" />
                    </Pressable>
                )}
            </View>

            {/* Floating re-centre pill (left) */}
            <Pressable style={styles.recentreFloating} onPress={centreOnUser}>
                <Locate size={16} color="#0f172a" />
                <Text style={styles.recentreFloatingText}>Re-centre</Text>
            </Pressable>

            {/* ── Location preview card (tap marker, before routing) ────────── */}
            {selected && !isRouting && (
                <View style={styles.previewCard}>
                    <View style={[styles.previewIconBox, { backgroundColor: selected.color + '22' }]}>
                        <MapPin size={20} color={selected.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.previewTitle}>{selected.title}</Text>
                        <Text style={styles.previewMeta}>{selected.category}</Text>
                    </View>
                    <Pressable
                        style={[styles.goBtn, { backgroundColor: selected.color }]}
                        onPress={() => startRoutingToLoc(selected)}
                    >
                        <NavIcon size={16} color="white" style={{ marginRight: 6 }} />
                        <Text style={styles.goBtnText}>Go</Text>
                    </Pressable>
                    <Pressable onPress={() => setSelected(null)} style={styles.previewClose}>
                        <X size={18} color="#94a3b8" />
                    </Pressable>
                </View>
            )}

            {/* ── Active navigation bottom sheet ────────────────────────────── */}
            {isRouting && (
                <View style={styles.navSheet}>
                    <View style={styles.sheetHandle} />

                    {/* Stats row — spinner while loading (fix #7) */}
                    {routeLoading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color="#4f46e5" />
                            <Text style={styles.loadingText}>Calculating route…</Text>
                        </View>
                    ) : (
                        <View style={styles.statsRow}> 
                            <View style={styles.statBlockLeft}>
                                <View style={styles.statTimeRow}>
                                    <Text style={styles.statBig}>
                                        {routeInfo ? `${Math.round(routeInfo.duration)}` : '—'}
                                    </Text>
                                    <Text style={styles.statUnitInline}>min</Text>
                                </View>
                                {routeInfo && (
                                    <Text style={styles.statMetaSmall}>
                                        {`${routeInfo.distance.toFixed(1)} km • ${arrivalTime ?? ''}`}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flex: 1 }} />
                        </View>
                    )}

                    {selected && (
                        <Text style={styles.destLabel} numberOfLines={1}>→ {selected.title}</Text>
                    )}

                    <View style={styles.actionRow}>
                        <Pressable style={styles.recentreBtn} onPress={centreOnUser}>
                            <NavIcon size={15} color="#1e293b" style={{ marginRight: 6 }} />
                            <Text style={styles.recentreBtnText}>Re-centre</Text>
                        </Pressable>
                        <Pressable style={styles.exitBtn} onPress={exitNavigation}>
                            <Text style={styles.exitBtnText}>Exit</Text>
                        </Pressable>
                    </View>

                    {/* Step counter when multi-step route is available */}
                    {routeSteps.length > 1 && (
                        <Text style={styles.stepCounter}>
                            Step {stepIndex + 1} of {routeSteps.length}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#e2e8f0' },
    map: { ...StyleSheet.absoluteFillObject },

    // Instruction banner
    instructionBanner: {
        position: 'absolute', top: 16, left: 16, right: 16, zIndex: 30,
        backgroundColor: '#166534', borderRadius: 18,
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 18, paddingHorizontal: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 16, elevation: 12,
    },
    instructionIcon: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    instructionText: { flex: 1, fontSize: 20, fontWeight: '700', color: 'white', lineHeight: 26 },

    // Search bar
    searchOverlay: { position: 'absolute', top: 16, left: 16, right: 16, zIndex: 20 },
    searchCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'white', borderRadius: 50, height: 52,
        shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
    },
    searchInput: { flex: 1, fontSize: 15, color: '#1e293b', paddingHorizontal: 10, height: '100%' },
    suggestions: {
        backgroundColor: 'white', borderRadius: 20, marginTop: 8, overflow: 'hidden',
        shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    },
    suggestionItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
    },
    suggestionDot: { width: 10, height: 10, borderRadius: 5 },
    suggestionTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    suggestionMeta: { fontSize: 12, color: '#64748b', marginTop: 1 },
    errorBanner: {
        marginTop: 8, backgroundColor: '#fef3c7', borderRadius: 12,
        paddingVertical: 10, paddingHorizontal: 14,
    },
    errorBannerText: { fontSize: 12, color: '#92400e', fontWeight: '500' },

    // Markers
    pin: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35, shadowRadius: 5, elevation: 6,
    },
    pinSelected: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: 'white' },
    callout: {
        backgroundColor: 'white', borderRadius: 14, padding: 14, minWidth: 160,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
    },
    calloutTitle: { fontSize: 14, fontWeight: 'bold', color: '#102a43' },
    calloutMeta: { fontSize: 12, color: '#627d98', marginTop: 2 },
    calloutAction: { fontSize: 11, color: '#4f46e5', fontWeight: '700', marginTop: 6 },

    // FABs
    fabColumn: {
        position: 'absolute', right: 16, bottom: 200,
        alignItems: 'center', gap: 12, zIndex: 20,
    },
    fabColumnRouting: { bottom: 270 },
    fab: {
        width: 52, height: 52, borderRadius: 26, backgroundColor: 'white',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    },
    fabActive: { backgroundColor: '#4f46e5' },

    // Preview card
    previewCard: {
        position: 'absolute', bottom: 32, left: 16, right: 16,
        backgroundColor: 'white', borderRadius: 20,
        flexDirection: 'row', alignItems: 'center',
        padding: 16, gap: 12,
        shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
    },
    previewIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    previewTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    previewMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
    goBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24 },
    goBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
    previewClose: { padding: 6 },

    // Nav bottom sheet
    navSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        paddingHorizontal: 24,
        shadowColor: '#0f172a', shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12, shadowRadius: 24, elevation: 20, zIndex: 30,
    },
    sheetHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20,
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
    loadingText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    statBlock: { flex: 1, alignItems: 'center' },
    statBig: { fontSize: 44, fontWeight: '900', color: '#1e293b', flexShrink: 1, textAlign: 'center' },
    statUnit: { fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 },
    statTimeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    statUnitInline: { fontSize: 14, color: '#64748b', fontWeight: '700', marginLeft: 8, marginBottom: 6 },
    statSep: { width: 1, height: 40, backgroundColor: '#e2e8f0', marginHorizontal: 8 },
    statBlockLeft: { width: 120, alignItems: 'flex-start' },
    statMetaSmall: { marginTop: 6, fontSize: 14, color: '#64748b', fontWeight: '600' },
    destLabel: { fontSize: 14, color: '#64748b', fontWeight: '500', marginBottom: 20, textAlign: 'center' },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    recentreBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f1f5f9', borderRadius: 50, paddingVertical: 14,
    },
    recentreBtnText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    exitBtn: { paddingHorizontal: 32, paddingVertical: 14, backgroundColor: '#ef4444', borderRadius: 50 },
    exitBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
    stepCounter: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 10, fontWeight: '500' },

    recentreFloating: {
        position: 'absolute', left: 16, bottom: 200,
        backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: 28, flexDirection: 'row', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 12, zIndex: 40,
    },
    recentreFloatingText: { marginLeft: 6, fontSize: 14, fontWeight: '700', color: '#0f172a' },

    // ── Animated avatar marker ────────────────────────────────────────────────
    // Wrapper that sizes the hit area and stacks pulse + arrow
    avatarContainer: {
        width: 52,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Outer pulse ring — scales up and down, sits behind the arrow
    avatarPulse: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(79, 70, 229, 0.22)',
    },
    // White circle with indigo border — rotates with heading
    avatarOuter: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'white',
        borderWidth: 3,
        borderColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
        elevation: 8,
    },
    // Triangle pointing UP — rotation of avatarOuter handles direction
    avatarArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 13,
        borderStyle: 'solid',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#4f46e5',
        marginBottom: 2,
    },
});
