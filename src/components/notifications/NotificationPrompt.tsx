'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out;
}

async function getOrRegisterSW(): Promise<ServiceWorkerRegistration> {
  // Get existing registration
  let reg = await navigator.serviceWorker.getRegistration('/');

  // If registration exists but is stuck (no active, installing, or waiting) — clear it
  if (reg && !reg.active && !reg.installing && !reg.waiting) {
    await reg.unregister();
    reg = undefined as any;
  }

  // Register fresh if needed
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  // Already active — done
  if (reg.active) return reg;

  // Wait for the installing/waiting SW to reach activated state
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('SW activation timed out — close the app fully, reopen from your Home Screen, then try again')), 30_000);
    const done = () => { clearTimeout(timeout); resolve(); };

    const poll = setInterval(() => {
      if (reg.active) { clearInterval(poll); done(); }
    }, 300);

    const sw = reg.installing ?? reg.waiting;
    if (sw) {
      sw.addEventListener('statechange', function() {
        if (reg.active) { clearInterval(poll); done(); }
      });
    }
  });

  return reg;
}

type Step = 'idle' | 'permission' | 'sw' | 'subscribing' | 'saving' | 'done';

export function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasPush = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    if (!hasPush) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      setIosGuide(true);
      setSupported(true);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    // Check if already subscribed — use getRegistration not .ready (avoids iOS hang)
    navigator.serviceWorker.getRegistration('/').then(reg => {
      if (!reg) return;
      reg.pushManager.getSubscription().then(sub => { if (sub) setSubscribed(true); });
    }).catch(() => {});
  }, []);

  async function subscribe() {
    setLoading(true);
    setError('');

    try {
      // Step 1: Request permission
      setStep('permission');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError(perm === 'denied'
          ? 'Notifications blocked. Go to Settings → this site → allow notifications, then try again.'
          : 'Permission not granted.');
        setStep('idle');
        setLoading(false);
        return;
      }

      // Step 2: Get service worker
      setStep('sw');
      let reg: ServiceWorkerRegistration;
      try {
        reg = await Promise.race([
          getOrRegisterSW(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SW registration timed out after 15s')), 15_000)),
        ]);
      } catch (err: any) {
        setError('Service worker failed: ' + (err?.message ?? 'unknown') + ' — Close and reopen the app from your Home Screen, then try again.');
        setStep('idle');
        setLoading(false);
        return;
      }

      // Step 3: Subscribe to push — iOS can take 30-60s on first attempt
      setStep('subscribing');
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError('Push notifications not configured — contact admin.');
        setStep('idle');
        setLoading(false);
        return;
      }

      let sub: PushSubscription;
      try {
        sub = await Promise.race([
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 90_000)),
        ]);
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (msg === 'timeout') {
          setError('Timed out waiting for push subscription. This can happen on iPhone — close the app fully, reopen from your Home Screen, and try again.');
        } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('not allowed')) {
          setError('Push permission denied. Check Settings → Notifications for this app.');
        } else {
          setError('Subscription failed: ' + msg);
        }
        setStep('idle');
        setLoading(false);
        return;
      }

      // Step 4: Save to server
      setStep('saving');
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError('Server error: ' + (d.error ?? res.status));
        setStep('idle');
        setLoading(false);
        return;
      }

      setSubscribed(true);
      setStep('done');
    } catch (err: any) {
      setError('Unexpected error: ' + (err?.message ?? String(err)));
      setStep('idle');
    }

    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    setError('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      }
      setSubscribed(false);
      setStep('idle');
    } catch (err: any) {
      setError('Could not disable: ' + (err?.message ?? String(err)));
    }
    setLoading(false);
  }

  if (!supported) return null;

  if (iosGuide) {
    return (
      <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-800">Add to Home Screen for notifications</h3>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          iPhone push notifications require the app to be installed. In Safari, tap the <strong>Share</strong> button (box with arrow) then <strong>Add to Home Screen</strong>. Open the app from your Home Screen, then come back here to enable notifications.
        </p>
      </div>
    );
  }

  const stepLabel: Record<Step, string> = {
    idle: '',
    permission: 'Requesting permission…',
    sw: 'Loading service worker…',
    subscribing: 'Registering with Apple — this can take up to 60s on iPhone…',
    saving: 'Saving…',
    done: '',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-aas-blue" />
        <h3 className="text-sm font-semibold text-gray-800">Push notifications</h3>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {permission === 'denied' ? (
        <p className="text-sm text-gray-500">
          Notifications are blocked. Go to <strong>Settings → this website → Notifications</strong> and allow them, then reload the app.
        </p>
      ) : subscribed ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-green-500" />
            <p className="text-sm text-green-600 font-medium">Enabled on this device</p>
          </div>
          <button
            onClick={unsubscribe}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-60"
          >
            <BellOff size={13} />
            {loading ? 'Disabling…' : 'Disable'}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Get notified about tasks, holiday decisions, breakdowns, and more.
          </p>
          <button
            onClick={subscribe}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            {loading ? 'Enabling…' : 'Enable notifications'}
          </button>
          {loading && step !== 'idle' && (
            <p className="text-xs text-gray-400">{stepLabel[step]}</p>
          )}
        </>
      )}
    </div>
  );
}
