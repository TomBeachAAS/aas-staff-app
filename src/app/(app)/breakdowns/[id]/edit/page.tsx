'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Camera, X, ImagePlus, Plus } from 'lucide-react';

const URGENCY_OPTIONS = [
  { value: 'low',      label: 'Low',      colour: 'border-gray-300 text-gray-600',      active: 'bg-gray-500 text-white border-gray-500' },
  { value: 'medium',   label: 'Medium',   colour: 'border-yellow-300 text-yellow-700',  active: 'bg-yellow-400 text-white border-yellow-400' },
  { value: 'high',     label: 'High',     colour: 'border-orange-300 text-orange-700',  active: 'bg-orange-500 text-white border-orange-500' },
  { value: 'critical', label: 'Critical', colour: 'border-red-300 text-red-700',        active: 'bg-red-500 text-white border-red-500' },
];

const CAN_CONTINUE_OPTIONS = [
  { value: 'yes',     label: '✅ Yes, keep working' },
  { value: 'caution', label: '⚠️ Use with caution' },
  { value: 'no',      label: '🚫 No — grounded' },
];

export default function EditBreakdownPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const submittingRef = useRef(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cause, setCause] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [machineName, setMachineName] = useState('');
  const [canContinue, setCanContinue] = useState('yes');
  const [urgency, setUrgency] = useState('medium');
  const [reportedAt, setReportedAt] = useState('');
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [equipment, setEquipment] = useState<{ id: string; name: string }[]>([]);
  const [showNewEquipment, setShowNewEquipment] = useState(false);
  const [newEquipName, setNewEquipName] = useState('');
  const [savingEquip, setSavingEquip] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('equipment').select('id, name').eq('is_active', true).order('name'),
      fetch(`/api/breakdowns/${id}`).then(r => r.json()),
    ]).then(([{ data: eq }, b]) => {
      setEquipment(eq ?? []);
      if (b?.id) {
        setTitle(b.title ?? '');
        setDescription(b.description ?? '');
        setCause(b.cause ?? '');
        setEquipmentId(b.equipment_id ?? '');
        setMachineName(b.machine_name ?? '');
        setCanContinue(b.can_continue ?? 'yes');
        setUrgency(b.urgency ?? 'medium');
        setReportedAt(b.reported_at ? new Date(b.reported_at).toISOString().slice(0, 16) : '');
        setExistingPhotos(b.photos ?? []);
      }
      setLoading(false);
    });
  }, [id]);

  async function handleAddEquipment() {
    if (!newEquipName.trim()) return;
    setSavingEquip(true);
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newEquipName.trim() }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Failed'); setSavingEquip(false); return; }
    setEquipment(prev => [...prev, { id: json.id, name: newEquipName.trim() }].sort((a, b) => a.name.localeCompare(b.name)));
    setEquipmentId(json.id);
    setMachineName('');
    setNewEquipName('');
    setShowNewEquipment(false);
    setSavingEquip(false);
  }

  function handlePhotos(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      setNewPhotos(prev => [...prev, { file, preview: URL.createObjectURL(file) }]);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!title.trim() || !description.trim()) { setError('Title and description required'); return; }
    if (!equipmentId && !machineName.trim()) { setError('Select or add a machine'); return; }

    submittingRef.current = true;
    setSaving(true);
    setError('');

    const uploadedUrls: string[] = [];
    if (newPhotos.length > 0) {
      setUploading(true);
      const supabase = createClient();
      for (const { file } of newPhotos) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('breakdown-photos').upload(path, file, { upsert: false });
        if (upErr) { setError('Photo upload failed: ' + upErr.message); setUploading(false); setSaving(false); submittingRef.current = false; return; }
        const { data: { publicUrl } } = supabase.storage.from('breakdown-photos').getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }
      setUploading(false);
    }

    const res = await fetch(`/api/breakdowns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        cause: cause.trim() || null,
        equipment_id: equipmentId || null,
        machine_name: machineName.trim() || null,
        can_continue: canContinue,
        urgency,
        photos: [...existingPhotos, ...uploadedUrls],
        reported_at: reportedAt ? new Date(reportedAt).toISOString() : undefined,
      }),
    });

    submittingRef.current = false;
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Failed to save'); return; }
    router.push(`/breakdowns/${id}`);
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

  if (loading) return <div className="p-8 text-center text-sm text-gray-400">Loading…</div>;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Edit breakdown</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Machine *</label>
            <button type="button" onClick={() => { setShowNewEquipment(v => !v); setEquipmentId(''); setMachineName(''); }} className="text-xs text-aas-blue hover:underline flex items-center gap-0.5">
              <Plus size={12} /> New machine
            </button>
          </div>
          <select value={equipmentId} onChange={e => { setEquipmentId(e.target.value); setMachineName(''); setShowNewEquipment(false); }} className={inputClass}>
            <option value="">— Select machine —</option>
            {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
          </select>
          {!equipmentId && !showNewEquipment && (
            <input value={machineName} onChange={e => setMachineName(e.target.value)} placeholder="Or type name if not in list" className={inputClass + ' mt-2'} />
          )}
          {showNewEquipment && (
            <div className="mt-2 p-3 rounded-lg border border-aas-blue/30 bg-aas-blue-pale space-y-2">
              <p className="text-xs font-semibold text-aas-blue">Add new machine</p>
              <input value={newEquipName} onChange={e => setNewEquipName(e.target.value)} placeholder="Machine name *" className={inputClass} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment())} />
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowNewEquipment(false); setNewEquipName(''); }} className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">Cancel</button>
                <button type="button" onClick={handleAddEquipment} disabled={savingEquip || !newEquipName.trim()} className="flex-1 py-1.5 bg-aas-blue text-white rounded-lg text-xs font-medium disabled:opacity-60">{savingEquip ? 'Adding…' : 'Add machine'}</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">What&apos;s broken? *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputClass + ' resize-none'} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cause (if known)</label>
          <input value={cause} onChange={e => setCause(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Can it keep working?</label>
          <div className="space-y-2">
            {CAN_CONTINUE_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setCanContinue(opt.value)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${canContinue === opt.value ? 'border-aas-blue bg-aas-blue-pale text-aas-blue font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
          <div className="grid grid-cols-4 gap-2">
            {URGENCY_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setUrgency(opt.value)}
                className={`py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${urgency === opt.value ? opt.active : opt.colour}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">When found</label>
          <input type="datetime-local" value={reportedAt} onChange={e => setReportedAt(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e => handlePhotos(e.target.files)} className="hidden" />
          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={e => handlePhotos(e.target.files)} className="hidden" />
          {(existingPhotos.length > 0 || newPhotos.length > 0) && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {existingPhotos.map(url => (
                <div key={url} className="relative aspect-square">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => setExistingPhotos(prev => prev.filter(p => p !== url))} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
              {newPhotos.map((p, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => setNewPhotos(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i); })} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-aas-blue hover:text-aas-blue transition-colors">
              <Camera size={18} /> Take photo
            </button>
            <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-aas-blue hover:text-aas-blue transition-colors">
              <ImagePlus size={18} /> Upload
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
