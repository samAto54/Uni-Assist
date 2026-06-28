import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import {
    registerForPushNotifications,
    addNotificationResponseListener,
    removeNotificationSubscription,
} from '../lib/notifications';
import { upsertPushToken } from '../lib/api';

function RootNavigator() {
    const router = useRouter();
    const { user } = useAuth();
    const notifListenerRef = useRef(null);

    useEffect(() => {
        // Register for push notifications and persist token to Supabase
        registerForPushNotifications().then(token => {
            if (token) {
                console.log('[Notifications] Push token registered');
                // Persist token so server can send push notifications
                if (user?.id) {
                    upsertPushToken(user.id, token, Platform.OS).then(({ error }) => {
                        if (error) console.warn('[Notifications] Token upsert failed:', error.message);
                    });
                }
            }
        });

        // Handle notification taps — navigate to the relevant screen
        notifListenerRef.current = addNotificationResponseListener((response) => {
            const data = response.notification.request.content.data;
            if (data?.type === 'announcement') {
                router.push('/(dashboard)/announcements');
            } else if (data?.type === 'class_reminder') {
                router.push('/(dashboard)/timetable');
            }
        });

        return () => {
            if (notifListenerRef.current) {
                removeNotificationSubscription(notifListenerRef.current);
            }
        };
    }, [user?.id, router]); // re-run when user logs in so token is always linked to current user

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#f8fafc' },
                gestureEnabled: true,
            }}
        >
            <Stack.Screen name="index"       options={{ gestureEnabled: false }} />
            <Stack.Screen name="(dashboard)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(lecturer)"  options={{ gestureEnabled: false }} />
        </Stack>
    );
}

export default function Layout() {
    return (
        <AuthProvider>
            <RootNavigator />
        </AuthProvider>
    );
}
