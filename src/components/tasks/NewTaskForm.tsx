'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { X, Plus } from 'lucide-react';

interface Props {
  userId: string;
  initialDate?: string;
  staff: { id: string; full_name: string }[];
  customers: { id: string; company_name: string }[];
  locations: { id: string; name: string }[];
  vehicles: { id: string; name: string; registration: string | null }[];
}

const JOB_TYPES = ['RaaS', 'Service', 'Demo', 'Delivery', 'Mapping', 'Consultancy'];

export function NewTaskForm({ userId, initialDate, staff, customers: initialCustomers, locations: initialLocations, vehicles: initialVehicles }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskDate, setTaskDate] = useState(initialDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState('normal');
  const [jobType, setJobType] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [notes, setNotes] = useState('');
  const [assignees, setAssignees] = useState<string[]>([userId]);
  const [autoRollover, setAutoRollover] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [customers, setCustomers] = useState(initialCustomers);
  const [locations, setLocations] = useState(initialLocations);
  const [vehicles, setVehicles] = useState(initialVehicles);

  // New customer modal
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState('');

  // New location modal
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocTown, setNewLocTown] = useState('');
  const [newLocPostcode, setNewLocPostcode] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  // New machine modal
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleReg, setNewVehicleReg] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState('');

  function toggleAssignee(id: string) {
    setAssignees(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  }

  async function saveNewCustomer() {
    if (!newCompanyName.trim()) { setCustomerError('Company name is required.'); return; }
    setSavingCustomer(true); setCustomerError('');
    const supabase = createClient();
    const { data, error: err } = await supabase.from('customers').insert({
      company_name: newCompanyName.trim(),
      contact_name: newContactName || null,
      phone: newPhone || null,
      email: newEmail || null,
      created_by: userId,
    }).select('id, company_name').single();
    if (err || !data) { setCustomerError(err?.message ?? 'Failed to save'); setSavingCustomer(false); return; }
    setCustomers(prev => [...prev, data].sort((a, b) => a.company_name.localeCompare(b.company_name)));
    setCustomerId(data.id);
    setShowNewCustomer(false);
    setNewCompanyName(''); setNewContactName(''); setNewPhone(''); setNewEmail('');
    setSavingCustomer(false);
  }

  async function saveNewLocation() {
    if (!newLocName.trim()) { setLocationError('Name is required.'); return; }
    setSavingLocation(true); setLocationError('');
    const supabase = createClient();
    const { data, error: err } = await supabase.from('locations').insert({
      name: newLocName.trim(),
      address_line1: newLocAddress || null,
      town: newLocTown || null,
      postcode: newLocPostcode || null,
      customer_id: customerId || null,
    }).select('id, name').single();
    if (err || !data) { setLocationError(err?.message ?? 'Failed to save'); setSavingLocation(false); return; }
    setLocations(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setLocationId(data.id);
    setShowNewLocation(false);
    setNewLocName(''); setNewLocAddress(''); setNewLocTown(''); setNewLocPostcode('');
    setSavingLocation(false);
  }

  async function saveNewVehicle() {
    if (!newVehicleName.trim()) { setVehicleError('Name is required.'); return; }
    setSavingVehicle(true); setVehicleError('');
    const supabase = createClient();
    const { data, error: err } = await supabase.from('vehicles').insert({
      name: newVehicleName.trim(),
      registration: newVehicleReg || null,
      type: newVehicleType || null,
      is_active: true,
    }).select('id, name, registration').single();
    if (err || !data) { setVehicleError(err?.message ?? 'Failed to save'); setSavingVehicle(false); return; }
    setVehicles(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setVehicleId(data.id);
    setShowNewVehicle(false);
    setNewVehicleName(''); setNewVehicleReg(''); setNewVehicleType('');
    setSavingVehicle(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) { setError('Title is required.'); return; }
    setLoading(true); setError('');

    const supabase = createClient();
    const { data: task, error: taskErr } = await supabase.from('tasks').insert({
      title,
      description: description || null,
      task_date: taskDate || null,
      start_time: allDay ? null : (startTime || null),
      end_time: allDay ? null : (endTime || null),
      priority,
      status: 'not_started',
      customer_id: customerId || null,
      location_id: locationId || null,
      vehicle_id: vehicleId || null,
      notes: [jobType ? `Job type: ${jobType}` : '', notes].filter(Boolean).join('\n') || null,
      auto_rollover: autoRollover,
      created_by: userId,
    }).select().single();

    if (taskErr || !task) {
      setError(taskErr?.message ?? 'Failed to create task');
      setLoading(false);
      return;
    }

    if (assignees.length > 0) {
      const { error: assignErr } = await supabase.from('task_assignees').insert(
        assignees.map(uid => ({ task_id: task.id, user_id: uid, assigned_by: userId }))
      );
      if (assignErr) {
        setError('Task created but failed to assign: ' + assignErr.message);
        setLoading(false);
        return;
      }
    }
// Notify assignees (excluding the creator)
fetch('/api/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'task_assigned',
    data: { taskTitle: title, assignees, assignedBy: userId },
  }),
});
    router.push('/tasks');
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-100 p-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="What needs doing?" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Job type</label>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map(type => (
              <button key={type} type="button" onClick={() => setJobType(jobType === type ? '' : type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  jobType === type ? 'bg-aas-blue text-white border-aas-blue' : 'bg-white text-gray-600 border-gray-300 hover:border-aas-blue hover:text-aas-blue'
                }`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className={inputClass}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
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

        {/* Customer */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Customer</label>
            <button type="button" onClick={() => { setShowNewCustomer(true); setCustomerError(''); }}
              className="flex items-center gap-1 text-xs text-aas-blue hover:underline">
              <Plus size={12} /> Add new
            </button>
          </div>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputClass}>
            <option value="">— none —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Location</label>
            <button type="button" onClick={() => { setShowNewLocation(true); setLocationError(''); }}
              className="flex items-center gap-1 text-xs text-aas-blue hover:underline">
              <Plus size={12} /> Add new
            </button>
          </div>
          <select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputClass}>
            <option value="">— none —</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* Machine */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Machine</label>
            <button type="button" onClick={() => { setShowNewVehicle(true); setVehicleError(''); }}
              className="flex items-center gap-1 text-xs text-aas-blue hover:underline">
              <Plus size={12} /> Add new
            </button>
          </div>
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={inputClass}>
            <option value="">— none —</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}{v.registration ? ` (${v.registration})` : ''}</option>)}
          </select>
        </div>

        {/* Assign to */}
        {staff.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {staff.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={assignees.includes(s.id)} onChange={() => toggleAssignee(s.id)} className="rounded" />
                  <span className="text-sm text-gray-700 truncate">{s.full_name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={autoRollover} onChange={e => setAutoRollover(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">Auto-move to next day if incomplete</span>
        </label>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {loading ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewCustomer(false)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">New customer</h3>
              <button onClick={() => setShowNewCustomer(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              {customerError && <div className="p-2 rounded-lg bg-red-50 text-sm text-red-700">{customerError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company name *</label>
                <input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="e.g. Acme Ltd" className={inputClass} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact name</label>
                <input value={newContactName} onChange={e => setNewContactName(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={newPhone} onChange={e => setNewPhone(e.target.value)} type="tel" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className={inputClass} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-4 pb-4">
              <button type="button" onClick={() => setShowNewCustomer(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
              <button type="button" onClick={saveNewCustomer} disabled={savingCustomer} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
                {savingCustomer ? 'Saving…' : 'Save customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Location Modal */}
      {showNewLocation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewLocation(false)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">New location</h3>
              <button onClick={() => setShowNewLocation(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              {locationError && <div className="p-2 rounded-lg bg-red-50 text-sm text-red-700">{locationError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site name *</label>
                <input value={newLocName} onChange={e => setNewLocName(e.target.value)} placeholder="e.g. North Farm" className={inputClass} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={newLocAddress} onChange={e => setNewLocAddress(e.target.value)} placeholder="Street address" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Town</label>
                  <input value={newLocTown} onChange={e => setNewLocTown(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                  <input value={newLocPostcode} onChange={e => setNewLocPostcode(e.target.value)} className={inputClass} />
                </div>
              </div>
              {customerId && <p className="text-xs text-gray-400">Will be linked to the selected customer.</p>}
            </div>
            <div className="flex gap-3 px-4 pb-4">
              <button type="button" onClick={() => setShowNewLocation(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
              <button type="button" onClick={saveNewLocation} disabled={savingLocation} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
                {savingLocation ? 'Saving…' : 'Save location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Machine Modal */}
      {showNewVehicle && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewVehicle(false)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">New machine</h3>
              <button onClick={() => setShowNewVehicle(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              {vehicleError && <div className="p-2 rounded-lg bg-red-50 text-sm text-red-700">{vehicleError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine name *</label>
                <input value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} placeholder="e.g. Sprayer 1" className={inputClass} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <input value={newVehicleType} onChange={e => setNewVehicleType(e.target.value)} placeholder="e.g. Drone, Tractor, Robot" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial / Registration</label>
                <input value={newVehicleReg} onChange={e => setNewVehicleReg(e.target.value)} placeholder="Optional" className={inputClass} />
              </div>
            </div>
            <div className="flex gap-3 px-4 pb-4">
              <button type="button" onClick={() => setShowNewVehicle(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
              <button type="button" onClick={saveNewVehicle} disabled={savingVehicle} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
                {savingVehicle ? 'Saving…' : 'Save machine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
