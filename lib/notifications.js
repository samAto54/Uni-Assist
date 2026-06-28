/**
 * lib/notifications.js
 * Push notification helpers for Uni-Assist.
 *
 * Usage:
 *   import { registerForPushNotifications, scheduleClassReminder, sendLocalNotification } from '../../lib/notifications';
 *
 * Call registerForPushNotifications() once on app start (inside AuthContext or _layout).
 * The returned token can be stored in Supabase for server-side push later.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ── Configure how notifications appear when the app is in the foreground ──────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// ── Request permission and get push token ─────────────────────────────────────
export async function registerForPushNotifications() {
    // Remote push tokens require a dev build + EAS projectId; skip in Expo Go.
    if (Constants.appOwnership === 'expo') {
        return null;
    }

    if (!Device.isDevice) {
        console.warn('[Notifications] Push notifications only work on physical devices.');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted.');
        return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Uni-Assist',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#102a43',
        });

        await Notifications.setNotificationChannelAsync('classes', {
            name: 'Class Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3b82f6',
        });

        await Notifications.setNotificationChannelAsync('announcements', {
            name: 'Announcements',
            importance: Notifications.AndroidImportance.DEFAULT,
            lightColor: '#10b981',
        });
    }

    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId
            ?? Constants.easConfig?.projectId;
        const tokenData = projectId
            ? await Notifications.getExpoPushTokenAsync({ projectId })
            : await Notifications.getExpoPushTokenAsync();
        return tokenData.data;
    } catch (e) {
        console.warn('[Notifications] Push token unavailable:', e.message);
        return null;
    }
}

// ── Schedule a local notification for an upcoming class ───────────────────────
// Call this when the timetable loads. Pass the session object.
// Fires 15 minutes before the class starts.
export async function scheduleClassReminder(session) {
    if (!session?.time_slot || !session?.course_code) return;

    try {
        // Parse the time slot (e.g. "09:00 AM" or "09:00 AM - 11:00 AM")
        const timePart = session.time_slot.split(/[-–]/)[0].trim();
        const spaceIdx = timePart.lastIndexOf(' ');
        const period = timePart.substring(spaceIdx + 1).toUpperCase();
        const [hStr, mStr] = timePart.substring(0, spaceIdx).split(':');
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr || '0', 10);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;

        const now = new Date();
        const classTime = new Date(now);
        classTime.setHours(h, m, 0, 0);

        // Remind 15 minutes before
        const reminderTime = new Date(classTime.getTime() - 15 * 60 * 1000);

        // Only schedule if reminder is in the future
        if (reminderTime <= now) return;

        const secondsUntil = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `Class in 15 minutes`,
                body: `${session.courseName || session.course_code} at ${session.location}`,
                data: { type: 'class_reminder', session },
                sound: true,
            },
            trigger: {
                seconds: secondsUntil,
                channelId: 'classes',
            },
        });
    } catch (e) {
        console.error('[Notifications] scheduleClassReminder error:', e.message);
    }
}

// ── Cancel all scheduled class reminders (call on sign-out or timetable refresh) ──
export async function cancelAllClassReminders() {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
        console.error('[Notifications] cancelAll error:', e.message);
    }
}

// ── Send an immediate local notification (for new announcements) ──────────────
export async function sendLocalNotification({ title, body, data = {} }) {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: { ...data, type: 'announcement' },
                sound: true,
            },
            trigger: null, // fire immediately
        });
    } catch (e) {
        console.error('[Notifications] sendLocal error:', e.message);
    }
}

// ── Listen for notification taps (call in root _layout) ───────────────────────
export function addNotificationResponseListener(handler) {
    return Notifications.addNotificationResponseReceivedListener(handler);
}

export function removeNotificationSubscription(subscription) {
    subscription?.remove?.();
}
