/**
 * Geospatial utilities for GIMPA Campus Map
 */

export const GIMPA_CENTER = {
    latitude: 5.6360544,
    longitude: -0.2006373,
};

export const CAMPUS_RADIUS_METERS = 2500; // Increased to cover Hawa Yakubu Hostel area

/**
 * Calculates the distance between two points in meters using the Haversine formula.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Checks if a coordinate is within the campus radius.
 */
export function isWithinCampus(lat, lng) {
    const distance = calculateDistance(lat, lng, GIMPA_CENTER.latitude, GIMPA_CENTER.longitude);
    return distance <= CAMPUS_RADIUS_METERS;
}

/**
 * Approximate bounding box for GIMPA campus area
 */
const LAT_OFFSET = 0.025;
const LNG_OFFSET = 0.025;

export const GIMPA_BOUNDS = {
    minLatitude: GIMPA_CENTER.latitude - LAT_OFFSET,
    maxLatitude: GIMPA_CENTER.latitude + LAT_OFFSET,
    minLongitude: GIMPA_CENTER.longitude - LNG_OFFSET,
    maxLongitude: GIMPA_CENTER.longitude + LNG_OFFSET,
};

