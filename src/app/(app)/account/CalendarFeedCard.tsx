'use client';

import { useState } from 'react';
import { Copy, Check, RefreshCw, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props {
  feedUrl: string;
  userId: string;
}

export function CalendarFeedCard({ feedUrl, userId }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(feedUrl);

  async function handleCopy() {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (!confirm('This will break any existing calendar subscriptions. Continue?')) return;
    setRegenerating(true);
    const supabase = createClient();
    const newToken = crypto.randomUUID();
    await supabase.from('profiles').update({ calendar_token: newToken }).eq('id', userId);
    const base = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    setCurrentUrl(base + newToken);
    setRegenerating(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar size={18} className="text-aas-blue" />
        <h3 className="text-sm font-semibold text-gray-800">Calendar subscription</h3>
      </div>

      <p className="text-sm text-gray-500">
        Subscribe to this URL in Apple Calendar, Google Calendar, or Outlook to see your work
        events, tasks, holidays and sickness alongside your personal calendar. Updates every hour.
      </p>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={currentUrl}
          className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-mono truncate"
        />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-xs font-medium hover:bg-aas-blue-dark transition-colors shrink-0"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="space-y-3 border-t border-gray-50 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How to subscribe</p>

        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-700">iPhone / Mac — Apple Calendar</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
            <li>Settings → Calendar → Accounts → Add Account</li>
            <li>Choose <strong>Other</strong> then <strong>Add Subscribed Calendar</strong></li>
            <li>Paste the URL above and tap <strong>Next → Save</strong></li>
          </ol>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-700">Google Calendar</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
            <li>Open Google Calendar on desktop</li>
            <li>Click <strong>+</strong> next to Other calendars → <strong>From URL</strong></li>
            <li>Paste the URL and click <strong>Add calendar</strong></li>
          </ol>
        </div>
      </div>

      <div className="border-t border-gray-50 pt-3">
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Regenerating…' : 'Regenerate URL (invalidates existing subscriptions)'}
        </button>
      </div>
    </div>
  );
}
