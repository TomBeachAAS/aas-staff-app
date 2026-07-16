'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Save } from 'lucide-react';

interface Props {
  settings: Record<string, string>;
  adminId: string;
}

const CURRENCIES = [
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'JPY', label: 'JPY — Japanese Yen (¥)' },
  { code: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
  { code: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { code: 'CHF', label: 'CHF — Swiss Franc (Fr)' },
];

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '4', label: 'April' },
  { value: '7', label: 'July' },
  { value: '10', label: 'October' },
];

export function SettingsForm({ settings, adminId }: Props) {
  const router = useRouter();
  const [values, setValues] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    default_holiday_allowance: '20',
    statutory_minimum_days: '20',
    mileage_rate_per_mile: '0.45',
    default_currency: 'GBP',
    leave_year_start_month: '1',
    default_start_time: '08:00',
    default_end_time: '17:00',
    default_weekly_hours: '45',
    timesheet_period_weeks: '4',
    ...settings,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    for (const [key, value] of Object.entries(values)) {
      await supabase.from('company_settings').upsert(
        { key, value, updated_by: adminId, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Company information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Company name">
            <input
              type="text"
              value={values['company_name']}
              onChange={e => set('company_name', e.target.value)}
              placeholder="Autonomous Agri Solutions Ltd"
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Address" description="Shown on generated documents.">
            <textarea
              value={values['company_address']}
              onChange={e => set('company_address', e.target.value)}
              rows={2}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={values['company_phone']}
              onChange={e => set('company_phone', e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={values['company_email']}
              onChange={e => set('company_email', e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payroll & entitlements</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Default holiday allowance (days)" description="Applied to new employees. Existing employees must be updated individually.">
            <input
              type="number"
              value={values['default_holiday_allowance']}
              onChange={e => set('default_holiday_allowance', e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Statutory minimum (days)" description="Warn admins if allowance is set below this.">
            <input
              type="number"
              value={values['statutory_minimum_days']}
              onChange={e => set('statutory_minimum_days', e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Leave year starts" description="The month the annual leave year resets.">
            <select
              value={values['leave_year_start_month']}
              onChange={e => set('leave_year_start_month', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Mileage rate (£ per mile)" description="Rate applied to personal vehicle mileage claims.">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">£</span>
              <input
                type="number"
                step="0.01"
                value={values['mileage_rate_per_mile']}
                onChange={e => set('mileage_rate_per_mile', e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-sm text-gray-500">per mile</span>
            </div>
          </Field>
          <Field label="Default expense currency" description="Pre-selected currency when submitting new expense claims.">
            <select
              value={values['default_currency']}
              onChange={e => set('default_currency', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Timesheet defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Default start time">
            <input
              type="time"
              value={values['default_start_time']}
              onChange={e => set('default_start_time', e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Default end time">
            <input
              type="time"
              value={values['default_end_time']}
              onChange={e => set('default_end_time', e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Default weekly hours">
            <input
              type="number"
              value={values['default_weekly_hours']}
              onChange={e => set('default_weekly_hours', e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Timesheet period (weeks)">
            <input
              type="number"
              min="1"
              max="4"
              value={values['timesheet_period_weeks']}
              onChange={e => set('timesheet_period_weeks', e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
        </CardContent>
      </Card>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors disabled:opacity-60"
      >
        <Save size={16} />
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
      </button>
    </div>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
