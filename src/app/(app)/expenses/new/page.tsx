'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/utils';
import { Camera, X, Image } from 'lucide-react';

const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  GBP: { symbol: '£', label: 'GBP — British Pound' },
  EUR: { symbol: '€', label: 'EUR — Euro' },
  USD: { symbol: '$', label: 'USD — US Dollar' },
  JPY: { symbol: '¥', label: 'JPY — Japanese Yen' },
  CAD: { symbol: 'C$', label: 'CAD — Canadian Dollar' },
  AUD: { symbol: 'A$', label: 'AUD — Australian Dollar' },
  CHF: { symbol: 'Fr', label: 'CHF — Swiss Franc' },
};

export default function NewExpensePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitIntentRef = useRef<'draft' | 'submitted'>('submitted');

  const [form, setForm] = useState({
    claim_date: format(new Date(), 'yyyy-MM-dd'),
    category: 'other',
    description: '',
    amount: '',
    currency: 'GBP',
    notes: '',
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<'draft' | 'submitted' | null>(null);
  const [error, setError] = useState('');

  const currencySymbol = CURRENCIES[form.currency]?.symbol ?? form.currency;

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceipt(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  function removeReceipt() {
    setReceipt(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) {
      setError('Description and amount are required.');
      return;
    }

    const intent = submitIntentRef.current;
    setLoading(intent);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let receipt_url: string | null = null;
    if (receipt) {
      const ext = receipt.name.split('.').pop() ?? 'jpg';
      const path = user.id + '/' + Date.now() + '.' + ext;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('expense-receipts')
        .upload(path, receipt, { upsert: false });
      if (uploadErr) {
        setError('Receipt upload failed: ' + uploadErr.message);
        setLoading(null);
        return;
      }
      const { data: { publicUrl } } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(uploadData.path);
      receipt_url = publicUrl;
    }

    const { error: err } = await supabase.from('expenses').insert({
      user_id: user.id,
      claim_date: form.claim_date,
      category: form.category as never,
      description: form.description,
      amount: parseFloat(form.amount),
      currency: form.currency,
      notes: form.notes || null,
      receipt_url,
      status: intent,
    });

    if (err) { setError(err.message); setLoading(null); return; }
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
          <input value={form.description} onChange={e => set('description', e.target.value)} required placeholder="e.g. Fuel for site visit to Lincoln" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue">
              {Object.entries(CURRENCIES).map(([code, { label }]) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({currencySymbol})</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Receipt photo</label>
          {receiptPreview ? (
            <div className="relative">
              <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-gray-50" />
              <button type="button" onClick={removeReceipt} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border border-gray-200">
                <X size={14} className="text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label className="flex-1 flex flex-col items-center gap-1.5 py-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-aas-blue transition-colors">
                <Camera size={22} className="text-gray-400" />
                <span className="text-xs text-gray-500">Take photo</span>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleReceiptChange} className="sr-only" />
              </label>
              <label className="flex-1 flex flex-col items-center gap-1.5 py-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-aas-blue transition-colors">
                <Image size={22} className="text-gray-400" />
                <span className="text-xs text-gray-500">Choose file</span>
                <input type="file" accept="image/*" onChange={handleReceiptChange} className="sr-only" />
              </label>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="submit"
            disabled={loading !== null}
            onClick={() => { submitIntentRef.current = 'submitted'; }}
            className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60"
          >
            {loading === 'submitted' ? (receipt ? 'Uploading…' : 'Submitting…') : 'Submit for approval'}
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading !== null}
              onClick={() => { submitIntentRef.current = 'draft'; }}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 disabled:opacity-60"
            >
              {loading === 'draft' ? 'Saving…' : 'Save as draft'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
