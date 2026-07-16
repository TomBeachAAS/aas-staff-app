'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  holidayId: string;
  status: string;
  isOwner: boolean;
}

export function HolidayActions({ holidayId, status, isOwner }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleWithdraw() {
    if (!confirm('Withdraw this holiday request? It will be permanently deleted.')) return;
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('holidays').delete().eq('id', holidayId);
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/holidays');
  }

  if (!isOwner || status !== 'pending') return null;

  return (
    <div className="space-y-2">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}
      <button
        onClick={handleWithdraw}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
      >
        <Trash2 size={14} />
        {loading ? 'Withdrawing…' : 'Withdraw request'}
      </button>
    </div>
  );
}
