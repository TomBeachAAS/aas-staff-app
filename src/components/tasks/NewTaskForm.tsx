'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface Props {
  userId: string;
  staff: { id: string; full_name: string }[];
  customers: { id: string; company_name: string }[];
  locations: { id: string; name: string }[];
  vehicles: { id: string; name: string; registration: string | null }[];
}

const JOB_TYPES = ['RaaS', 'Service', 'Demo', 'Delivery', 'Mapping', 'Consultancy'];

export function NewTaskForm({ userId, staff, customers, locations, vehicles }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskDate, setTaskDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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

  function toggleAssignee(id: string) {
    setAssignees(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) { setError('Title is required.'); return; }
    setLoading(true);
    setError('');

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

    if (taskErr || !task) { setError(taskErr?.message ?? 'Failed to create task'); setLoading(false); return; }

    if (assignees.length > 0) {
      await supabase.from('task_assignees').insert(
        assignees.map(uid => ({ task_id: task.id, user_id: uid, assigned_by: userId }))
      );
    }

    router.push('/tasks');
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-100 p-4">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          placeholder="What needs doing?"
          className={inputClass}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Job type tabs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Job type</label>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setJobType(jobType === type ? '' : type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                jobType === type
                  ? 'bg-aas-blue text-white border-aas-blue'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-aas-blue hover:text-aas-blue'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Date + Priority */}
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

      {/* All day toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allDay}
          onChange={e => setAllDay(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-700">All day</span>
      </label>

      {/* Start / end time — hidden when all day */}
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

      {/* Customer + Location */}
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* Machine (vehicle) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
        <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={inputClass}>
          <option value="">— none —</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>
              {v.name}{v.registration ? ` (${v.registration})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Assign to */}
      {staff.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {staff.map(s => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignees.includes(s.id)}
                  onChange={() => toggleAssignee(s.id)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 truncate">{s.full_name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Auto rollover */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={autoRollover}
          onChange={e => setAutoRollover(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-700">Auto-move to next day if incomplete</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
          {loading ? 'Creating…' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
