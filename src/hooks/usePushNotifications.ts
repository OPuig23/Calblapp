'use client'

import { useEffect } from "react";

export default function usePushNotifications(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    if (!("serviceWorker" in navigator)) return;

    async function subscribe() {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscription: sub })
      });
    }

    subscribe();
  }, [userId]);
}
