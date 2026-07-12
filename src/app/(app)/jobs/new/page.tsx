'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [customerId, setCustomerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [isManagerOrAdmin, setIsManagerOrAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.auth.getUser(),
      supabase.from('customers').select('id, company_name').eq('is_active', true).order('company_name'),
      supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
    ]).then(async ([{ data: { user } }, { data: c }, { data: l }]) => {
      setCustomers(c ?? []);
      setLocations(l ?? []);
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setIsManagerOrAdmin(['administrator', 'manager'].includes(prof?.role ?? ''));
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { error: err } = await supabase.from('job_board').insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: isManagerOrAdmin ? 'open' : 'pending_approval',
      created_by: user.id,
      customer_id: customerId || null,
      location_id: locationId || null,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/jobs');
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const priorityActive: Record<string, string> = {
    low: 'bg-gray-500 text-white border-gray-500',
    medium: 'bg-aas-blue text-white border-aas-blue',
    high: 'bg-amber-500 text-white border-amber-500',
    urgent: 'bg-red-600 text-white border-red-600',
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-5">Add Job</h2>
      {!isManagerOrAdmin && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
          Your job will be submitted for manager approval before appearing on the board.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs doing?" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Any extra details…" className={`${inputClass} resize-none`} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <div className="flex gap-2">
            {priorities.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${
                  priority === p ? priorityActive[p] : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {customers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer (optional)</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputClass}>
              <option value="">— none —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
        )}

        {locations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
            <select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputClass}>
              <option value="">— none —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {loading ? 'Saving…' : isManagerOrAdmin ? 'Add to board' : 'Submit for approval'}
          </button>
        </div>
      </form>
    </div>
  );
}
