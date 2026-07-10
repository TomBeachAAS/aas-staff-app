'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [priority, setPriority] = useState('normal');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [vehicleId, setVehicleId] = useState('');

  const [customers, setCustomers] = useState<{id: string; company_name: string}[]>([]);
  const [locations, setLocations] = useState<{id: string; name: string}[]>([]);
  const [vehicles, setVehicles] = useState<{id: string; registration: string; make?: string}[]>([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('tasks').select('*').eq('id', id).single(),
      supabase.from('customers').select('id, company_name').eq('is_active', true).order('company_name'),
      supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
      supabase.from('vehicles').select('id, registration, make').eq('is_active', true).order('registration'),
    ]).then(([{ data: task }, { data: c }, { data: l }, { data: v }]) => {
      if (task) {
        setTitle(task.title ?? '');
        setDescription(task.description ?? '');
        setTaskDate(task.task_date ?? '');
        setAllDay(task.all_day ?? true);
        setStartTime(task.start_time?.slice(0, 5) ?? '09:00');
        setEndTime(task.end_time?.slice(0, 5) ?? '17:00');
        setPriority(task.priority ?? 'normal');
        setStatus(task.status ?? 'pending');
        setNotes(task.notes ?? '');
        setCustomerId(task.customer_id ?? '');
        setLocationId(task.location_id ?? '');
        setVehicleId(task.vehicle_id ?? '');
      }
      setCustomers(c ?? []);
      setLocations(l ?? []);
      setVehicles(v ?? []);
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('tasks').update({
      title: title.trim(),
      description: description || null,
      task_date: taskDate || null,
      all_day: allDay,
      start_time: !allDay ? startTime + ':00' : null,
      end_time: !allDay ? endTime + ':00' : null,
      priority,
      status,
      notes: notes || null,
      customer_id: customerId || null,
      location_id: locationId || null,
      vehicle_id: vehicleId || null,
    }).eq('id', id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push(`/tasks/${id}`);
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-6 h-6 border-2 border-aas-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Edit task</h2>
        <Link href={`/tasks/${id}`} className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} className={inputClass}>
            {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} className={inputClass} />
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded" />
        <span className="text-sm text-gray-700">All day</span>
      </label>

      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputClass} />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
        <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputClass}>
          <option value="">— none —</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputClass}>
          <option value="">— none —</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Machine / Vehicle</label>
        <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={inputClass}>
          <option value="">— none —</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration}{v.make ? ` — ${v.make}` : ''}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold hover:bg-aas-blue-dark disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
