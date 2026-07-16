'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  holiday_allowance: number | null;
  timesheet_access: boolean | null;
  expenses_access: boolean | null;
  holiday_access: boolean | null;
}

export function StaffEditForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    job_title: profile.job_title ?? '',
    department: profile.department ?? '',
    start_date: profile.start_date ?? '',
    end_date: profile.end_date ?? '',
    holiday_allowance: profile.holiday_allowance ?? 28,
    timesheet_access: !!profile.timesheet_access,
    expenses_access: !!profile.expenses_access,
    holiday_access: !!profile.holiday_access,
  });

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      job_title: form.job_title.trim() || null,
      department: form.department.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      holiday_allowance: Number(form.holiday_allowance),
      timesheet_access: form.timesheet_access,
      expenses_access: form.expenses_access,
      holiday_access: form.holiday_access,
    }).eq('id', profile.id);
    if (err) { setError(err.message); setSaving(false); return; }
    router.push('/staff/' + profile.id);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Full name" required>
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
          </Field>
          <Field label="Phone">
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
          </Field>
          <Field label="Job title">
            <input type="text" value={form.job_title} onChange={e => set('job_title', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
          </Field>
          <Field label="Department">
            <input type="text" value={form.department} onChange={e => set('department', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Employment dates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Start date">
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
          </Field>
          <Field label="End date">
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Leave &amp; permissions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Holiday allowance (days / year)">
            <input type="number" min={0} max={365} value={form.holiday_allowance} onChange={e => set('holiday_allowance', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue" />
          </Field>
          <Toggle label="Timesheets access" checked={form.timesheet_access} onChange={v => set('timesheet_access', v)} />
          <Toggle label="Expenses access" checked={form.expenses_access} onChange={v => set('expenses_access', v)} />
          <Toggle label="Holidays access" checked={form.holiday_access} onChange={v => set('holiday_access', v)} />
        </CardContent>
      </Card>

      <button type="submit" disabled={saving} className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (checked ? 'bg-aas-blue' : 'bg-gray-200')}
      >
        <span className={'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  );
}
