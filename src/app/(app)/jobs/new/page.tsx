'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, X } from 'lucide-react';

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [customerId, setCustomerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isManager, setIsManager] = useState(false);
  const [userId, setUserId] = useState('');

  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string; customer_id: string | null }[]>([]);

  // Quick-add customer
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Quick-add location
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationPostcode, setNewLocationPostcode] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        setIsManager(['administrator', 'manager'].includes(data?.role ?? ''));
      });
    });
    loadDropdowns();
  }, []);

  async function loadDropdowns() {
    const supabase = createClient();
    const [{ data: c }, { data: l }] = await Promise.all([
      supabase.from('customers').select('id, company_name').eq('is_active', true).order('company_name'),
      supabase.from('locations').select('id, name, customer_id').eq('is_active', true).order('name'),
    ]);
    setCustomers(c ?? []);
    setLocations(l ?? []);
  }

  // Filter locations by selected customer
  const filteredLocations = customerId
    ? locations.filter(l => l.customer_id === customerId || !l.customer_id)
    : locations;

  async function handleAddCustomer() {
    if (!newCustomerName.trim()) return;
    setSavingCustomer(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('customers')
      .insert({ company_name: newCustomerName.trim(), is_active: true })
      .select('id, company_name')
      .single();
    setSavingCustomer(false);
    if (err || !data) { setError(err?.message ?? 'Failed to create customer'); return; }
    setCustomers(prev => [...prev, data].sort((a, b) => a.company_name.localeCompare(b.company_name)));
    setCustomerId(data.id);
    setNewCustomerName('');
    setShowNewCustomer(false);
  }

  async function handleAddLocation() {
    if (!newLocationName.trim()) return;
    setSavingLocation(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('locations')
      .insert({
        name: newLocationName.trim(),
        postcode: newLocationPostcode.trim() || null,
        customer_id: customerId || null,
        is_active: true,
      })
      .select('id, name, customer_id')
      .single();
    setSavingLocation(false);
    if (err || !data) { setError(err?.message ?? 'Failed to create location'); return; }
    setLocations(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setLocationId(data.id);
    setNewLocationName('');
    setNewLocationPostcode('');
    setShowNewLocation(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    const status = isManager ? 'open' : 'pending_approval';
    const { error: err } = await supabase.from('job_board').insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      customer_id: customerId || null,
      location_id: locationId || null,
      created_by: userId,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push('/jobs');
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Add job</h2>

      {!isManager && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
          Your job will be submitted for manager approval before appearing on the board.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Any details, instructions or context…"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <div className="grid grid-cols-4 gap-2">
            {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${
                  priority === p
                    ? p === 'urgent' ? 'bg-red-500 text-white border-red-500'
                    : p === 'high' ? 'bg-orange-500 text-white border-orange-500'
                    : p === 'medium' ? 'bg-yellow-400 text-white border-yellow-400'
                    : 'bg-gray-400 text-white border-gray-400'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Customer */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <button
              type="button"
              onClick={() => { setShowNewCustomer(v => !v); setShowNewLocation(false); }}
              className="text-xs text-aas-blue hover:underline flex items-center gap-0.5"
            >
              <Plus size={12} /> New customer
            </button>
          </div>
          <select
            value={customerId}
            onChange={e => { setCustomerId(e.target.value); setLocationId(''); }}
            className={inputClass}
          >
            <option value="">— none —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>

          {showNewCustomer && (
            <div className="mt-2 p-3 rounded-lg border border-aas-blue/30 bg-aas-blue-pale space-y-2">
              <p className="text-xs font-semibold text-aas-blue">New customer</p>
              <input
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                placeholder="Company name *"
                className={inputClass}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomer())}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewCustomer(false); setNewCustomerName(''); }}
                  className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomer}
                  disabled={savingCustomer || !newCustomerName.trim()}
                  className="flex-1 py-1.5 bg-aas-blue text-white rounded-lg text-xs font-medium disabled:opacity-60"
                >
                  {savingCustomer ? 'Saving…' : 'Add customer'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <button
              type="button"
              onClick={() => { setShowNewLocation(v => !v); setShowNewCustomer(false); }}
              className="text-xs text-aas-blue hover:underline flex items-center gap-0.5"
            >
              <Plus size={12} /> New location
            </button>
          </div>
          <select
            value={locationId}
            onChange={e => setLocationId(e.target.value)}
            className={inputClass}
          >
            <option value="">— none —</option>
            {filteredLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          {showNewLocation && (
            <div className="mt-2 p-3 rounded-lg border border-aas-blue/30 bg-aas-blue-pale space-y-2">
              <p className="text-xs font-semibold text-aas-blue">New location</p>
              <input
                value={newLocationName}
                onChange={e => setNewLocationName(e.target.value)}
                placeholder="Location name *"
                className={inputClass}
              />
              <input
                value={newLocationPostcode}
                onChange={e => setNewLocationPostcode(e.target.value)}
                placeholder="Postcode (optional)"
                className={inputClass}
              />
              {customerId && (
                <p className="text-xs text-gray-500">Will be linked to the selected customer.</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewLocation(false); setNewLocationName(''); setNewLocationPostcode(''); }}
                  className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddLocation}
                  disabled={savingLocation || !newLocationName.trim()}
                  className="flex-1 py-1.5 bg-aas-blue text-white rounded-lg text-xs font-medium disabled:opacity-60"
                >
                  {savingLocation ? 'Saving…' : 'Add location'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'Saving…' : isManager ? 'Post job' : 'Submit for approval'}
          </button>
        </div>
      </form>
    </div>
  );
}
