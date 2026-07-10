'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/utils';

export default function NewExpensePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    claim_date: format(new Date(), 'yyyy-MM-dd'),
    category: 'other',
    description: '',
    amount: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) { setError('Description and amount are required.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from('expenses').insert({
      user_id: user.id,
      claim_date: form.claim_date,
      category: form.category as never,
      description: form.description,
      amount: parseFloat(form.amount),
      currency: 'GBP',
      notes: form.notes || null,
      status: 'draft',
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/expenses');
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-5">New expense claim</h2>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-100 p-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={form.claim_date} onChange={e => set('claim_date', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue">
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              required
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none" />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {loading ? 'Saving…' : 'Save as draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
