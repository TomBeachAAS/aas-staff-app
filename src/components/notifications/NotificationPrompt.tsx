'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      setPermission(Notification.permission);
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub));
      });
    }
  }, []);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError('Push notifications are not configured yet. Contact your administrator.');
        setLoading(false);
        return;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to save subscription');
      }

      setSubscribed(true);
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      setError(err?.message ?? 'Could not enable notifications. Try again.');
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
        setSubscribed(false);
      }
    } catch (err: any) {
      console.error('Unsubscribe failed:', err);
      setError(err?.message ?? 'Could not disable notifications.');
    }
    setLoading(false);
  }

  if (!supported) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-aas-blue" />
        <h3 className="text-sm font-semibold text-gray-800">Push notifications</h3>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {permission === 'denied' ? (
        <p className="text-sm text-gray-500">
          Notifications are blocked. Go to your browser or phone settings and allow notifications for this site.
        </p>
      ) : subscribed ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-600 font-medium">✓ Enabled on this device</p>
          <button
            onClick={unsubscribe}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <BellOff size={13} />
            {loading ? 'Disabling…' : 'Disable'}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Get notified when tasks are assigned to you, holidays are approved, and more.
          </p>
          <p className="text-xs text-amber-600">
            iPhone: you must add this app to your home screen first, then open it from there.
          </p>
          <button
            onClick={subscribe}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors disabled:opacity-60"
          >
            <Bell size={14} />
            {loading ? 'Enabling…' : 'Enable notifications'}
          </button>
        </>
      )}
    </div>
  );
}
