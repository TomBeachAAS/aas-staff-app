'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}-timeout`)), ms);
    promise
      .then(val => { clearTimeout(timer); resolve(val); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

export function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);
  const [iosAddToHome, setIosAddToHome] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasPush = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    if (!hasPush) return;

    // iOS: must be in standalone (PWA) mode for push to work
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      setIosAddToHome(true);
      setSupported(true);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    // Check existing subscription (with timeout — SW can hang on iOS)
    withTimeout(navigator.serviceWorker.ready, 8000, 'sw')
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) setSubscribed(true); })
      .catch(() => {/* ignore — not subscribed */});
  }, []);

  // Scroll error into view when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  async function subscribe() {
    setLoading(true);
    setError('');
    try {
      const perm = await withTimeout(
        Promise.resolve(Notification.requestPermission()),
        15000,
        'permission'
      );
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return; }

      let reg: ServiceWorkerRegistration;
      try {
        reg = await withTimeout(navigator.serviceWorker.ready, 12000, 'sw');
      } catch {
        setError('Service worker timed out. Close the app completely, reopen from your Home Screen, and try again.');
        setLoading(false);
        return;
      }

      let sub: PushSubscription;
      try {
        sub = await withTimeout(
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
          }),
          20000,
          'subscribe'
        );
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (msg.includes('subscribe-timeout')) {
          setError('Subscription timed out. This sometimes happens on iPhone — close the app fully, reopen from your Home Screen, and try again.');
        } else if (msg.includes('not allowed') || msg.includes('permission')) {
          setError('Notification permission was denied. Go to Settings → Safari → Notifications and allow this site.');
        } else {
          setError('Could not subscribe: ' + msg + '. Try closing and reopening the app.');
        }
        setLoading(false);
        return;
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error('Server registration failed (' + res.status + ')');

      setSubscribed(true);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes('permission-timeout')) {
        setError('The permission dialog did not respond. Please try again.');
      } else if (msg.includes('sw-timeout')) {
        setError('Service worker timed out. Reopen the app from your Home Screen and try again.');
      } else {
        setError('Could not enable notifications: ' + msg);
      }
      console.error('Push subscription failed:', err);
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    setError('');
    try {
      const reg = await withTimeout(navigator.serviceWorker.ready, 8000, 'sw');
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
      setError('Could not disable: ' + (err?.message ?? String(err)));
    }
    setLoading(false);
  }

  if (!supported) return null;

  if (iosAddToHome) {
    return (
      <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-800">Home Screen required for notifications</h3>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          iOS requires this app to be installed to your Home Screen. In Safari, tap the Share button then choose <strong>Add to Home Screen</strong>. Then open the app from your Home Screen and return here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-aas-blue" />
        <h3 className="text-sm font-semibold text-gray-800">Push notifications</h3>
      </div>

      {error && (
        <div ref={errorRef} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {permission === 'denied' ? (
        <p className="text-sm text-gray-500">
          Notifications are blocked. Go to Settings and allow notifications for this site.
        </p>
      ) : subscribed ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-600 font-medium">Enabled on this device</p>
          <button
            onClick={unsubscribe}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-60"
          >
            <BellOff size={13} />
            {loading ? 'Disabling...' : 'Disable'}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Get notified when tasks are assigned, holidays approved, and more.
          </p>
          <button
            onClick={subscribe}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors disabled:opacity-60"
          >
            <Bell size={14} />
            {loading ? 'Enabling...' : 'Enable notifications'}
          </button>
          {loading && (
            <p className="text-xs text-gray-400">
              This can take up to 20 seconds on iPhone — please wait…
            </p>
          )}
        </>
      )}
    </div>
  );
}
