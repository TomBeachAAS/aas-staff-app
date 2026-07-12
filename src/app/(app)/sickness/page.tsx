'use client';

import { useState, useEffect } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SicknessPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<any>(null);
  const [allStaff, setAllStaff] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);
    setTargetUserId(user.id);

    const isManager = ['administrator', 'manager'].includes(p?.role ?? '');

    // Fetch records without profile join (avoids FK ambiguity)
    let query = supabase
      .from('sickness_records')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(50);
    if (!isManager) query = query.eq('user_id', user.id);

    const { data: recs } = await query;

    // Two-step profile fetch
    const userIds = [...new Set((recs ?? []).map((r: any) => r.user_id).filter(Boolean))];
    const { data: profileRows } = userIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] };
    const map = Object.fromEntries((profileRows ?? []).map((p: any) => [p.id, p.full_name]));

    if (isManager) {
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('status', 'active')
        .order('full_name');
      setAllStaff(staff ?? []);
    }

    setRecords(recs ?? []);
    setProfileMap(map);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) return;
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: err } = await supabase.from('sickness_records').insert({
      user_id: targetUserId || user.id,
      entered_by: user.id,
      start_date: startDate,
      end_date: endDate || null,
      sickness_type: 'sick',
      private_notes: notes || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowForm(false);
    setNotes('');
    setEndDate('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    loadData();
  }

  async function handleClose(id: string) {
    const supabase = createClient();
    await supabase.from('sickness_records').update({ end_date: closeDate }).eq('id', id);
    setClosingId(null);
    loadData();
  }

  const isManager = ['administrator', 'manager'].includes(profile?.role ?? '');
  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-aas-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Sickness</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors"
        >
          <Plus size={16} />
          Report
        </button>
      </div>

      {/* Report form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Report sickness</h3>
            <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {isManager && allStaff.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">For</label>
                <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className={inputClass}>
                  {allStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First day absent</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">Leave return date blank if still off</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400">(managers only)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional — reason, details, etc."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records */}
      <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
        {records.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">No sickness records</div>
        ) : (
          records.map(r => {
            const days = r.end_date
              ? differenceInCalendarDays(new Date(r.end_date), new Date(r.start_date)) + 1
              : null;
            const isOngoing = !r.end_date;

            return (
              <div key={r.id} className="px-4 py-3">
                {isManager && (
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    {profileMap[r.user_id] ?? 'Unknown'}
                  </p>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-800">
                      {format(new Date(r.start_date), 'd MMM yyyy')}
                      {r.end_date
                        ? ` – ${format(new Date(r.end_date), 'd MMM yyyy')}`
                        : ' – present'}
                    </p>
                    {days !== null && (
                      <p className="text-xs text-gray-400 mt-0.5">{days} {days === 1 ? 'day' : 'days'}</p>
                    )}
                    {isManager && r.private_notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{r.private_notes}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOngoing && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        Ongoing
                      </span>
                    )}
                    {isOngoing && (isManager || r.user_id === profile?.id) && (
                      closingId === r.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={closeDate}
                            onChange={e => setCloseDate(e.target.value)}
                            className="text-xs border border-gray-200 rounded px-1.5 py-1"
                          />
                          <button
                            onClick={() => handleClose(r.id)}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setClosingId(null)}
                            className="text-xs text-gray-400 px-1 py-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setClosingId(r.id); setCloseDate(format(new Date(), 'yyyy-MM-dd')); }}
                          className="text-xs text-aas-blue hover:underline"
                        >
                          Set return date
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
