'use client';

import { useState, useEffect } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function SicknessPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [allStaff, setAllStaff] = useState<{ id: string; full_name: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addStart, setAddStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [addEnd, setAddEnd] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const manager = ['administrator', 'manager'].includes(p?.role ?? '');
    setIsManager(manager);
    setCurrentUserId(user.id);
    setAddUserId(user.id);

    // Two-step fetch — sickness_records has user_id AND entered_by both FK to profiles
    let query = supabase
      .from('sickness_records')
      .select('id, user_id, entered_by, start_date, end_date, sickness_type, private_notes, created_at')
      .order('start_date', { ascending: false })
      .limit(50);
    if (!manager) query = query.eq('user_id', user.id);
    const { data: rawRecords } = await query;

    const userIds = [...new Set((rawRecords ?? []).map((r: any) => r.user_id))];
    let pMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      pMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    }

    setRecords(rawRecords ?? []);
    setProfileMap(pMap);

    if (manager) {
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('status', 'active')
        .order('full_name');
      setAllStaff(staff ?? []);
    }

    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('sickness_records').insert({
      user_id: addUserId || user.id,
      entered_by: user.id,
      start_date: addStart,
      end_date: addEnd || null,
      sickness_type: 'sick',
      private_notes: addNotes || null,
    });
    setShowForm(false);
    setAddNotes('');
    setAddEnd('');
    setAddUserId(user.id);
    setSaving(false);
    loadData();
  }

  function startEdit(record: any) {
    setEditingId(record.id);
    setEditStart(record.start_date);
    setEditEnd(record.end_date ?? '');
    setEditNotes(record.private_notes ?? '');
    setDeleteConfirmId(null);
  }

  async function handleEdit(id: string) {
    setEditSaving(true);
    const supabase = createClient();
    await supabase.from('sickness_records').update({
      start_date: editStart,
      end_date: editEnd || null,
      private_notes: editNotes || null,
    }).eq('id', id);
    setEditingId(null);
    setEditSaving(false);
    loadData();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from('sickness_records').delete().eq('id', id);
    setDeleteConfirmId(null);
    setDeletingId(null);
    loadData();
  }

  function dayCount(start: string, end: string | null) {
    const endDate = end ? new Date(end) : new Date();
    return differenceInCalendarDays(endDate, new Date(start)) + 1;
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

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
          onClick={() => { setShowForm(!showForm); setEditingId(null); setDeleteConfirmId(null); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          Report
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Log sickness</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              {isManager && allStaff.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">For</label>
                  <select value={addUserId} onChange={e => setAddUserId(e.target.value)} className={inputClass}>
                    {allStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}{s.id === currentUserId ? ' (me)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First day absent</label>
                  <input type="date" value={addStart} onChange={e => { setAddStart(e.target.value); if (addEnd && addEnd < e.target.value) setAddEnd(''); }} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="date" value={addEnd} min={addStart} onChange={e => setAddEnd(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Private notes <span className="text-gray-400 font-normal">(managers only)</span></label>
                <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
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
              const name = profileMap[r.user_id] ?? 'Unknown';
              const days = dayCount(r.start_date, r.end_date);
              const isEditing = editingId === r.id;
              const isConfirmDelete = deleteConfirmId === r.id;

              if (isEditing) {
                return (
                  <div key={r.id} className="px-4 py-3 bg-blue-50 border-l-4 border-aas-blue">
                    {isManager && (
                      <p className="text-xs font-semibold text-aas-blue mb-2">{name}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">First day</label>
                        <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Return date</label>
                        <input type="date" value={editEnd} min={editStart} onChange={e => setEditEnd(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    {isManager && (
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-0.5">Private notes</label>
                        <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                        <X size={12} /> Cancel
                      </button>
                      <button onClick={() => handleEdit(r.id)} disabled={editSaving} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-aas-blue text-white rounded-lg font-medium disabled:opacity-60">
                        <Check size={12} /> {editSaving ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={r.id} className="px-4 py-3">
                  {isManager && (
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">{name}</p>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        {format(new Date(r.start_date), 'd MMM yyyy')}
                        {r.end_date
                          ? ` – ${format(new Date(r.end_date), 'd MMM yyyy')}`
                          : ' (ongoing)'}
                        <span className="text-xs text-gray-400 ml-2">
                          {days} {days === 1 ? 'day' : 'days'}{!r.end_date ? ' so far' : ''}
                        </span>
                      </p>
                      {isManager && r.private_notes && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">{r.private_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!r.end_date && !isManager && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Ongoing</span>
                      )}
                      {isManager && (
                        <>
                          {isConfirmDelete ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-red-600 font-medium">Delete?</span>
                              <button
                                onClick={() => handleDelete(r.id)}
                                disabled={deletingId === r.id}
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg font-medium disabled:opacity-60"
                              >
                                {deletingId === r.id ? '…' : 'Yes'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded-lg text-gray-600"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(r)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-aas-blue hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => { setDeleteConfirmId(r.id); setEditingId(null); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
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
