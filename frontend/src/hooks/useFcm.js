import { useEffect, useRef } from 'react';
import { getFirebaseMessaging, getToken, onMessage, firebaseConfig, isConfigured } from '../services/firebase';
import api from '../services/api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function useFcm(user, onForegroundMessage) {
  const registered = useRef(false);

  useEffect(() => {
    // Only run for authenticated shop admins (not superadmin, not staff with parent)
    if (!user || user.role === 'superadmin' || user.parent_user_id) return;
    if (!isConfigured()) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (registered.current) return;

    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Register SW with Firebase config embedded as query params so the SW
        // can initialise without needing access to Vite env vars.
        const swUrl =
          '/firebase-messaging-sw.js?' +
          new URLSearchParams({
            apiKey:            firebaseConfig.apiKey,
            authDomain:        firebaseConfig.authDomain,
            projectId:         firebaseConfig.projectId,
            storageBucket:     firebaseConfig.storageBucket,
            messagingSenderId: firebaseConfig.messagingSenderId,
            appId:             firebaseConfig.appId,
          }).toString();

        const swReg = await navigator.serviceWorker.register(swUrl, { scope: '/' });

        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        const fcmToken = await getToken(messaging, {
          vapidKey:                VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (fcmToken) {
          await api.post('/auth/fcm-token', { token: fcmToken });
          registered.current = true;
        }

        // Handle messages when the app is in the foreground.
        onMessage(messaging, (payload) => {
          onForegroundMessage?.(payload);
        });
      } catch (err) {
        // Non-fatal — push notifications are optional.
        console.warn('FCM setup failed:', err?.message ?? err);
      }
    })();
  }, [user?.id]);
}
