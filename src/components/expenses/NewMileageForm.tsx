'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Camera, X, Image, MapPin } from 'lucide-react';

export function NewMileageForm({ userId, ratePerMile }: { userId: string; ratePerMile: number }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitIntentRef = useRef<'draft' | 'submitted'>('submitted');

  const [form, setForm] = useState({
    claim_date: format(new Date(), 'yyyy-MM-dd'),
    from_location: '',
    to_location: '',
    business_reason: '',
    distance_miles: '',
    vehicle_reg: '',
    notes: '',
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<'draft' | 'submitted' | null>(null);
  const [error, setError] = useState('');

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

  const amount = form.distance_miles ? (parseFloat(form.distance_miles) * ratePerMile).toFixed(2) : '0.00';

  const mapsUrl = form.from_location && form.to_location
    ? `https://www.google.com/maps/dir/${encodeURIComponent(form.from_location)}/${encodeURIComponent(form.to_location)}`
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.from_location || !form.to_location || !form.distance_miles || !form.business_reason) {
      setError('Please fill in all required fields.'); return;
    }
    const intent = submitIntentRef.current;
    setLoading(intent);
    const supabase = createClient();

    let receipt_url: string | null = null;
    if (receipt) {
      const ext = receipt.name.split('.').pop() ?? 'jpg';
      const path = userId + '/mileage-' + Date.now() + '.' + ext;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('expense-receipts').upload(path, receipt, { upsert: false });
      if (uploadErr) { setError('Receipt upload failed: ' + uploadErr.message); setLoading(null); return; }
      const { data: { publicUrl } } = supabase.storage.from('expense-receipts').getPublicUrl(uploadData.path);
      receipt_url = publicUrl;
    }

    const { error: err } = await supabase.from('mileage_claims').insert({
      user_id: userId, claim_date: form.claim_date, from_location: form.from_location,
      to_location: form.to_location, business_reason: form.business_reason,
      distance_miles: parseFloat(form.distance_miles), vehicle_reg: form.vehicle_reg || null,
      rate_per_mile: ratePerMile, calculated_amount: parseFloat(amount),
      notes: form.notes || null, receipt_url, status: intent,
    });
    if (err) { setError(err.message); setLoading(null); return; }
    router.push('/mileage');
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-100 p-4">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input type="date" value={form.claim_date} onChange={e => set('claim_date', e.target.value)} required className={inp} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
        <input value={form.from_location} onChange={e => set('from_location', e.target.value)} required placeholder="e.g. AAS Office, Lincoln" className={inp} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
        <input value={form.to_location} onChange={e => set('to_location', e.target.value)} required placeholder="e.g. Customer Farm, Boston" className={inp} />
      </div>

      {/* Distance helper */}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-aas-blue hover:underline"
        >
          <MapPin size={12} />
          Open route in Google Maps to check distance
        </a>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Business reason *</label>
        <input value={form.business_reason} onChange={e => set('business_reason', e.target.value)} required className={inp} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Distance (miles) *</label>
          <input type="number" step="0.1" min="0" value={form.distance_miles} onChange={e => set('distance_miles', e.target.value)} required className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle reg</label>
          <input value={form.vehicle_reg} onChange={e => set('vehicle_reg', e.target.value)} placeholder="AB12 CDE" className={inp} />
        </div>
      </div>
      {form.distance_miles && (
        <div className="bg-aas-blue-pale rounded-lg px-3 py-2 text-sm text-aas-blue font-medium">
          {form.distance_miles} miles × {ratePerMile}p = <strong>£{amount}</strong>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inp + ' resize-none'} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Proof / receipt photo</label>
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
        <button type="submit" disabled={loading !== null} onClick={() => { submitIntentRef.current = 'submitted'; }} className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {loading === 'submitted' ? (receipt ? 'Uploading…' : 'Submitting…') : 'Submit for approval'}
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
          <button type="submit" disabled={loading !== null} onClick={() => { submitIntentRef.current = 'draft'; }} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 disabled:opacity-60">
            {loading === 'draft' ? 'Saving…' : 'Save as draft'}
          </button>
        </div>
      </div>
    </form>
  );
}
