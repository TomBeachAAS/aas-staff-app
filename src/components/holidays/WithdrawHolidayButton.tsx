'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function WithdrawHolidayButton({ holidayId }: { holidayId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleWithdraw() {
    if (!confirm('Withdraw this holiday request? It will be removed and you can re-apply if needed.')) return;
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase
      .from('holidays')
      .delete()
      .eq('id', holidayId);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.push('/holidays');
  }

  return (
    <div className="space-y-2">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}
      <button
        onClick={handleWithdraw}
        disabled={loading}
        className="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
      >
        {loading ? 'Withdrawing…' : 'Withdraw request'}
      </button>
    </div>
  );
}
