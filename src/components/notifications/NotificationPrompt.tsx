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
  const [iosNotStandalone, setIosNotStandalone] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      setIosNotStandalone(true);
      return;
    }

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    ) {
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

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      setError('Request timed out. Check that notifications are allowed for this site in your device settings, then try again.');
      setLoading(false);
    }, 15000);

    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        clearTimeout(timer);
        setError('Push notifications are not configured yet. Contact your administrator.');
        setLoading(false);
        return;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        clearTimeout(timer);
        setLoading(false);
        return;
      }

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

      clearTimeout(timer);
      setSubscribed(true);
    } catch (err: any) {
      clearTimeout(timer);
      if (!timedOut) {
        console.error('Push subscription failed:', err);
        setError(err?.message ?? 'Could not enable notifications. Try again.');
      }
    }
    if (!timedOut) setLoading(false);
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

  // iOS Safari only supports push when installed as a PWA
  if (iosNotStandalone) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-aas-blue" />
          <h3 className="text-sm font-semibold text-gray-800">Push notifications</h3>
        </div>
        <p className="text-xs text-gray-500">
          On iPhone, notifications require the app to be installed. Tap the{' '}
          <span className="font-medium text-gray-700">Share</span> button in Safari, then{' '}
          <span className="font-medium text-gray-700">Add to Home Screen</span>, and open the app from there.
        </p>
      </div>
    );
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
          <p className="text-sm text-green-600 font-medium">&#10003; Enabled on this device</p>
          <button
            onClick={unsubscribe}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <BellOff size={13} />
            {loading ? 'Disabling...' : 'Disable'}
          </button>
        </div>
      ) : (
        <button
          onClick={subscribe}
          disabled={loading}
          className="w-full py-2 px-4 bg-aas-blue text-white text-sm font-medium rounded-lg hover:bg-aas-blue-dark transition-colors disabled:opacity-60"
        >
          {loading ? 'Enabling…' : 'Enable notifications'}
        </button>
      )}
    </div>
  );
}
