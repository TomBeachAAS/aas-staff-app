'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

export function NewMileageForm({ userId, ratePerMile }: { userId: string; ratePerMile: number }) {
  const router = useRouter();
  const [form, setForm] = useState({
    claim_date: format(new Date(), 'yyyy-MM-dd'),
    from_location: '',
    to_location: '',
    business_reason: '',
    distance_miles: '',
    vehicle_reg: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const amount = form.distance_miles ? (parseFloat(form.distance_miles) * ratePerMile).toFixed(2) : '0.00';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.from_location || !form.to_location || !form.distance_miles || !form.business_reason) {
      setError('Please fill in all required fields.'); return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('mileage_claims').insert({
      user_id: userId,
      claim_date: form.claim_date,
      from_location: form.from_location,
      to_location: form.to_location,
      business_reason: form.business_reason,
      distance_miles: parseFloat(form.distance_miles),
      vehicle_reg: form.vehicle_reg || null,
      rate_per_mile: ratePerMile,
      calculated_amount: parseFloat(amount),
      notes: form.notes || null,
      status: 'draft',
    });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/mileage');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-100 p-4">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input type="date" value={form.claim_date} onChange={e => set('claim_date', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
        <input value={form.from_location} onChange={e => set('from_location', e.target.value)} required placeholder="e.g. AAS Office, Lincoln" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
        <input value={form.to_location} onChange={e => set('to_location', e.target.value)} required placeholder="e.g. Customer Farm, Boston" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Business reason *</label>
        <input value={form.business_reason} onChange={e => set('business_reason', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Distance (miles) *</label>
          <input type="number" step="0.1" min="0" value={form.distance_miles} onChange={e => set('distance_miles', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle reg</label>
          <input value={form.vehicle_reg} onChange={e => set('vehicle_reg', e.target.value)} placeholder="AB12 CDE" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
        </div>
      </div>
      {form.distance_miles && (
        <div className="bg-aas-blue-pale rounded-lg px-3 py-2 text-sm text-aas-blue font-medium">
          {form.distance_miles} miles × {ratePerMile}p = <strong>£{amount}</strong>
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
          {loading ? 'Saving…' : 'Save draft'}
        </button>
      </div>
    </form>
  );
}
