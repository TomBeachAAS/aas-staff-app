'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/utils';
import { ArrowLeft, Camera, X, Image } from 'lucide-react';
import Link from 'next/link';

const CURRENCIES = [
{ code: 'GBP', symbol: '£' },
{ code: 'EUR', symbol: '€' },
{ code: 'USD', symbol: '$' },
{ code: 'CAD', symbol: 'CA$' },
{ code: 'AUD', symbol: 'A$' },
{ code: 'CHF', symbol: 'CHF' },
{ code: 'SEK', symbol: 'kr' },
{ code: 'NOK', symbol: 'kr' },
{ code: 'DKK', symbol: 'kr' },
{ code: 'JPY', symbol: '¥' },
];

export default function EditExpensePage() {
const router = useRouter();
const { id } = useParams<{ id: string }>();
const cameraInputRef = useRef<HTMLInputElement>(null);
const galleryInputRef = useRef<HTMLInputElement>(null);
const submitIntentRef = useRef<'draft' | 'submitted'>('submitted');

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState<'draft' | 'submitted' | null>(null);
const [error, setError] = useState('');
const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
const [newReceipt, setNewReceipt] = useState<File | null>(null);
const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);
const [userId, setUserId] = useState('');

const [form, setForm] = useState({
claim_date: format(new Date(), 'yyyy-MM-dd'),
category: 'other',
description: '',
amount: '',
currency: 'GBP',
notes: '',
});

function set(key: string, value: string) {
setForm(prev => ({ ...prev, [key]: value }));
}

useEffect(() => {
async function load() {
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) { router.push('/login'); return; }
setUserId(user.id);

const { data: expense } = await supabase
.from('expenses')
.select('*')
.eq('id', id)
.eq('user_id', user.id)
.in('status', ['draft', 'submitted', 'rejected'])
.single();

if (!expense) { router.push('/expenses/' + id); return; }

setForm({
claim_date: expense.claim_date,
category: expense.category,
description: expense.description,
amount: String(expense.amount),
currency: expense.currency ?? 'GBP',
notes: expense.notes ?? '',
});
setExistingReceiptUrl(expense.receipt_url ?? null);
setLoading(false);
}
load();
}, [id, router]);

function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
const file = e.target.files?.[0];
if (!file) return;
setNewReceipt(file);
setReceiptPreview(URL.createObjectURL(file));
setRemoveExistingReceipt(false);
}

function clearReceipt() {
setNewReceipt(null);
setReceiptPreview(null);
setRemoveExistingReceipt(true);
if (cameraInputRef.current) cameraInputRef.current.value = '';
if (galleryInputRef.current) galleryInputRef.current.value = '';
}

async function handleSubmit(e: React.FormEvent) {
e.preventDefault();
if (!form.description || !form.amount) {
setError('Description and amount are required.'); return;
}
const intent = submitIntentRef.current;
setSaving(intent);
const supabase = createClient();

let receipt_url = removeExistingReceipt ? null : (existingReceiptUrl ?? null);

if (newReceipt) {
const ext = newReceipt.name.split('.').pop() ?? 'jpg';
const path = userId + '/' + Date.now() + '.' + ext;
const { data: uploadData, error: uploadErr } = await supabase.storage
.from('expense-receipts').upload(path, newReceipt, { upsert: false });
if (uploadErr) { setError('Receipt upload failed: ' + uploadErr.message); setSaving(null); return; }
const { data: { publicUrl } } = supabase.storage.from('expense-receipts').getPublicUrl(uploadData.path);
receipt_url = publicUrl;
}

const { error: err } = await supabase.from('expenses').update({
claim_date: form.claim_date,
category: form.category as never,
description: form.description,
amount: parseFloat(form.amount),
currency: form.currency,
notes: form.notes || null,
receipt_url,
status: intent,
}).eq('id', id);

if (err) { setError(err.message); setSaving(null); return; }
router.push('/expenses/' + id);
}

const currencySymbol = CURRENCIES.find(c => c.code === form.currency)?.symbol ?? '£';
const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

if (loading) return <div className="p-4 text-sm text-gray-400">Loading…</div>;

const showReceipt = receiptPreview ?? (!removeExistingReceipt ? existingReceiptUrl : null);

return (
<div className="p-4 max-w-md mx-auto">
<div className="flex items-center gap-3 mb-5">
<Link href={'/expenses/' + id} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
<ArrowLeft size={18} className="text-gray-600" />
</Link>
<h2 className="text-lg font-bold text-gray-800">Edit expense</h2>
</div>
{error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

<form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-100 p-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
<input type="date" value={form.claim_date} onChange={e => set('claim_date', e.target.value)} required className={inp} />
</div>

<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
<select value={form.category} onChange={e => set('category', e.target.value)} className={inp}>
{Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
<option key={k} value={k}>{v}</option>
))}
</select>
</div>

<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
<input value={form.description} onChange={e => set('description', e.target.value)} required className={inp} />
</div>

<div className="grid grid-cols-3 gap-2">
<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
<select value={form.currency} onChange={e => set('currency', e.target.value)} className={inp}>
{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
</select>
</div>
<div className="col-span-2">
<label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
<div className="relative">
<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
<input type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" className={'pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue w-full'} />
</div>
</div>
</div>

<div>
<label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
<textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inp + ' resize-none'} />
</div>

<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Receipt photo</label>
{showReceipt ? (
<div className="relative">
<img src={showReceipt} alt="Receipt preview" className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-gray-50" />
<button type="button" onClick={clearReceipt} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border border-gray-200">
<X size={14} className="text-gray-600" />
</button>
</div>
) : (
<div className="flex gap-2">
<label className="flex-1 flex flex-col items-center gap-1.5 py-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-aas-blue transition-colors">
<Camera size={22} className="text-gray-400" />
<span className="text-xs text-gray-500">Take photo</span>
<input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleReceiptChange} className="sr-only" />
</label>
<label className="flex-1 flex flex-col items-center gap-1.5 py-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-aas-blue transition-colors">
<Image size={22} className="text-gray-400" />
<span className="text-xs text-gray-500">Choose file</span>
<input ref={galleryInputRef} type="file" accept="image/*" onChange={handleReceiptChange} className="sr-only" />
</label>
</div>
)}
</div>

<div className="space-y-2 pt-1">
<button type="submit" disabled={saving !== null} onClick={() => { submitIntentRef.current = 'submitted'; }}
className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60">
{saving === 'submitted' ? 'Submitting…' : 'Submit for approval'}
</button>
<div className="flex gap-3">
<Link href={'/expenses/' + id} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 text-center">
Cancel
</Link>
<button type="submit" disabled={saving !== null} onClick={() => { submitIntentRef.current = 'draft'; }}
className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 disabled:opacity-60">
{saving === 'draft' ? 'Saving…' : 'Save as draft'}
</button>
</div>
</div>
</form>
</div>
);
}
