'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'manager', label: 'Manager' },
  { value: 'administrator', label: 'Administrator' },
];

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export default function NewStaffPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [activeDays, setActiveDays] = useState<Record<string, boolean>>({
    mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false,
  });

  function toggleDay(key: string) {
    setActiveDays(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setPending(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    const body = {
      email: (data.get('email') as string || '').trim().toLowerCase(),
      full_name: (data.get('full_name') as string || '').trim(),
      role: data.get('role') as string,
      job_title: (data.get('job_title') as string || '').trim() || null,
      department: (data.get('department') as string || '').trim() || null,
      phone: (data.get('phone') as string || '').trim() || null,
      start_date: data.get('start_date') as string || null,
      holiday_allowance: parseInt(data.get('holiday_allowance') as string) || 28,
      weekly_hours: parseFloat(data.get('weekly_hours') as string) || 40,
      timesheet_access: (document.getElementById('timesheet_access') as HTMLInputElement)?.checked !== false,
      expenses_access: (document.getElementById('expenses_access') as HTMLInputElement)?.checked !== false,
      working_days: DAYS.filter(d => activeDays[d.key]).map(d => d.key),
    };

    try {
      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Something went wrong.');
      } else {
        router.push('/staff');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/staff" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Add staff member</h2>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Personal details</p>

          <div>
            <label className={labelCls}>Full name *</label>
            <input name="full_name" required placeholder="e.g. Jane Smith" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Email address *</label>
            <input name="email" type="email" required placeholder="jane@example.com" className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">An invite email will be sent so they can set their password.</p>
          </div>

          <div>
            <label className={labelCls}>Phone</label>
            <input name="phone" type="tel" placeholder="+44 7700 900000" className={inputCls} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Role & position</p>

          <div>
            <label className={labelCls}>Role *</label>
            <select name="role" required defaultValue="employee" className={inputCls}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Job title</label>
            <input name="job_title" placeholder="e.g. Field Technician" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Department</label>
            <input name="department" placeholder="e.g. Operations" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Start date</label>
            <input name="start_date" type="date" className={inputCls} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Working pattern</p>

          <div>
            <label className={labelCls}>Working days</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={'px-3 py-1.5 rounded-full text-xs font-medium transition-colors ' +
                    (activeDays[key] ? 'bg-aas-blue text-white' : 'bg-gray-100 text-gray-400')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Weekly hours</label>
            <input name="weekly_hours" type="number" step="0.5" min="1" max="84" defaultValue="40" className={inputCls} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Leave & access</p>

          <div>
            <label className={labelCls}>Holiday allowance (days per year)</label>
            <input name="holiday_allowance" type="number" min="0" max="365" defaultValue="28" className={inputCls} />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input id="timesheet_access" type="checkbox" defaultChecked className="w-4 h-4 rounded text-aas-blue" />
              <div>
                <p className="text-sm font-medium text-gray-700">Timesheet access</p>
                <p className="text-xs text-gray-400">Can log and view timesheets</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input id="expenses_access" type="checkbox" defaultChecked className="w-4 h-4 rounded text-aas-blue" />
              <div>
                <p className="text-sm font-medium text-gray-700">Expenses access</p>
                <p className="text-xs text-gray-400">Can submit expense and mileage claims</p>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60"
        >
          {pending ? 'Creating account & sending invite...' : 'Create staff member & send invite'}
        </button>

      </form>
    </div>
  );
}
