"use client";

import { useEffect } from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const bookingEventName = "airislens-booking-created";

function hasFirebaseWebConfig() {
  return (
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.authDomain &&
    !!firebaseConfig.projectId &&
    !!firebaseConfig.storageBucket &&
    !!firebaseConfig.messagingSenderId &&
    !!firebaseConfig.appId &&
    !!vapidKey
  );
}

function getFirebaseApp() {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

export default function NotificationBootstrap() {
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function setupNotifications() {
      if (!hasFirebaseWebConfig()) {
        return;
      }

      if (!(await isSupported())) {
        return;
      }

      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted" || !isMounted) {
        return;
      }

      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      const messaging = getMessaging(getFirebaseApp());
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!token || !isMounted) {
        return;
      }

      await fetch("/api/admin/notifications/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title || "Booking baru masuk";
        const body = payload.notification?.body || "Ada booking baru yang masuk.";

        window.dispatchEvent(
          new CustomEvent(bookingEventName, {
            detail: {
              customerName: payload.data?.customerName,
              packageName: payload.data?.packageName,
              date: payload.data?.date,
              time: payload.data?.time,
              location: payload.data?.location,
            },
          })
        );

        registration.showNotification(title, {
          body,
          icon: "/svg/logogram.svg",
          badge: "/svg/logogram.svg",
          data: {
            clickUrl: payload.data?.clickUrl || "/admin/bookinglist",
          },
        });
      });
    }

    void setupNotifications();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  return null;
}
