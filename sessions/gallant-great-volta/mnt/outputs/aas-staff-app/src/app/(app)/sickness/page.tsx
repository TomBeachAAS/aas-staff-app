'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { SicknessRecord, Profile } from '@/types/database';

export default function SicknessPage() {
  const [records, setRecords] = useState<SicknessRecord[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    const isManager = ['administrator', 'manager'].includes(p?.role ?? '');
    let query = supabase
      .from('sickness_records')
      .select('*, user:profiles(full_name)')
      .order('start_date', { ascending: false })
      .limit(30);
    if (!isManager) query = query.eq('user_id', user.id);
    const { data } = await query;
    setRecords(data ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('sickness_records').insert({
      user_id: user.id,
      entered_by: user.id,
      start_date: startDate,
      end_date: endDate || null,
      sickness_type: 'sick',
      private_notes: notes || null,
    });
    setShowForm(false);
    setNotes('');
    setEndDate('');
    setSaving(false);
    loadData();
  }

  const isManager = ['administrator', 'manager'].includes(profile?.role ?? '');

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-aas-blue border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Sickness</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          Report
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Report sickness</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First day absent</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return date (leave blank if ongoing)</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Private notes (visible to managers only)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{isManager ? 'All sickness records' : 'My sickness records'}</CardTitle></CardHeader>
        {records.length === 0 ? (
          <CardContent><p className="text-sm text-gray-400 text-center py-6">No sickness records</p></CardContent>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map(r => {
              const user = r.user as {full_name: string} | undefined;
              return (
                <div key={r.id} className="px-4 py-3">
                  {isManager && user && (
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">{user.full_name}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-800">
                        {format(new Date(r.start_date), 'd MMM yyyy')}
                        {r.end_date ? ` – ${format(new Date(r.end_date), 'd MMM yyyy')}` : ' (ongoing)'}
                      </p>
                      {isManager && r.private_notes && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">{r.private_notes}</p>
                      )}
                    </div>
                    {!r.end_date && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Ongoing</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
