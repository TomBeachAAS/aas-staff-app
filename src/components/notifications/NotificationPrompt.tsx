'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out;
}

type SwState = 'checking' | 'active' | 'installing' | 'unavailable';

export function NotificationPrompt() {
  const [swState, setSwState] = useState<SwState>('checking');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasPush = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    if (!hasPush) { setSwState('unavailable'); return; }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) { setIosGuide(true); setSupported(true); return; }

    setSupported(true);
    setPermission(Notification.permission);
    checkSwState();
  }, []);

  async function checkSwState() {
    setSwState('checking');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) { setSwState('installing'); waitForSw(); return; }
      if (reg.active) {
        setSwState('active');
        // Check existing subscription
        const sub = await reg.pushManager.getSubscription().catch(() => null);
        if (sub) setSubscribed(true);
        return;
      }
      // SW exists but not active yet
      setSwState('installing');
      waitForSw(reg);
    } catch {
      setSwState('unavailable');
    }
  }

  async function waitForSw(existingReg?: ServiceWorkerRegistration) {
    try {
      // Use navigator.serviceWorker.ready — resolves when SW active AND controlling page
      // next-pwa with skipWaiting:true + clients.claim() should make this quick
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 60_000)),
      ]);
      setSwState('active');
      const sub = await reg.pushManager.getSubscription().catch(() => null);
      if (sub) setSubscribed(true);
    } catch {
      // SW failed to activate — show refresh prompt
      setSwState('installing'); // stays in installing = shows refresh button
    }
  }

  async function subscribe() {
    setLoading(true);
    setError('');

    try {
      setStatus('Requesting permission…');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError(perm === 'denied'
          ? 'Blocked in Settings. Go to Settings → this app → Notifications and allow them.'
          : 'Permission not granted.');
        setLoading(false);
        setStatus('');
        return;
      }

      setStatus('Getting service worker…');
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg?.active) {
        setError('Service worker not ready. Tap Reload below, wait a moment, then try again.');
        setLoading(false);
        setStatus('');
        setSwState('installing');
        return;
      }

      setStatus('Registering with Apple — keep the app open, this can take a minute…');
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) { setError('Push not configured — contact admin.'); setLoading(false); setStatus(''); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      setStatus('Saving…');
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError('Server error: ' + (d.error ?? res.status));
        setLoading(false);
        setStatus('');
        return;
      }

      setSubscribed(true);
      setStatus('');
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('not allowed')) {
        setError('Permission denied. Check Settings → Notifications for this site.');
      } else {
        setError('Failed: ' + msg);
      }
      setStatus('');
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        const sub = await reg.pushManager.getSubscription().catch(() => null);
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
          In Safari, tap the <strong>Share</strong> button then <strong>Add to Home Screen</strong>. Open the app from your Home Screen, then return here.
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
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {permission === 'denied' ? (
        <p className="text-sm text-gray-500">
          Notifications blocked. Go to <strong>Settings → this app → Notifications</strong> and allow them, then reload.
        </p>
      ) : swState === 'checking' ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={14} className="animate-spin" /> Checking…
        </div>
      ) : swState === 'installing' ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">The app is still loading in the background. Reload and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium"
          >
            <RefreshCw size={14} /> Reload app
          </button>
        </div>
      ) : subscribed ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-green-500" />
            <p className="text-sm text-green-600 font-medium">Enabled on this device</p>
          </div>
          <button onClick={unsubscribe} disabled={loading} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 disabled:opacity-60">
            <BellOff size={13} /> {loading ? 'Disabling…' : 'Disable'}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">Get notified about tasks, holidays, breakdowns, and more.</p>
          <button onClick={subscribe} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            {loading ? 'Enabling…' : 'Enable notifications'}
          </button>
          {status && <p className="text-xs text-gray-400">{status}</p>}
        </>
      )}
    </div>
  );
}
