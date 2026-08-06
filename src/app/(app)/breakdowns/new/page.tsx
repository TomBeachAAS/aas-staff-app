'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Camera, X, Plus, ImagePlus } from 'lucide-react';

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

export default function NewBreakdownPage() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cause, setCause] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [machineName, setMachineName] = useState('');
  const [canContinue, setCanContinue] = useState('yes');
  const [urgency, setUrgency] = useState('medium');
  const [reportedAt, setReportedAt] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  });

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [equipment, setEquipment] = useState<{ id: string; name: string }[]>([]);

  // Quick-add equipment
  const [showNewEquipment, setShowNewEquipment] = useState(false);
  const [newEquipName, setNewEquipName] = useState('');
  const [savingEquip, setSavingEquip] = useState(false);

  useEffect(() => {
    loadEquipment();
  }, []);

  async function loadEquipment() {
    const supabase = createClient();
    const { data } = await supabase
      .from('equipment')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setEquipment(data ?? []);
  }

  async function handleAddEquipment() {
    if (!newEquipName.trim()) return;
    setSavingEquip(true);
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newEquipName.trim() }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Failed to add equipment'); setSavingEquip(false); return; }
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
      const preview = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { file, preview }]);
    });
  }

  function removePhoto(idx: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!title.trim()) { setError('Title is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (!equipmentId && !machineName.trim()) { setError('Select or add a machine'); return; }

    submittingRef.current = true;
    setSaving(true);
    setError('');

    const photoUrls: string[] = [];
    if (photos.length > 0) {
      setUploading(true);
      const supabase = createClient();
      for (const { file } of photos) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('breakdown-photos')
          .upload(path, file, { upsert: false });
        if (upErr) {
          setError('Photo upload failed: ' + upErr.message);
          setUploading(false); setSaving(false); submittingRef.current = false;
          return;
        }
        const { data: { publicUrl } } = supabase.storage.from('breakdown-photos').getPublicUrl(path);
        photoUrls.push(publicUrl);
      }
      setUploading(false);
    }

    const res = await fetch('/api/breakdowns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        cause: cause.trim() || null,
        equipment_id: equipmentId || null,
        machine_name: machineName.trim() || null,
        can_continue: canContinue,
        urgency,
        photos: photoUrls,
        reported_at: new Date(reportedAt).toISOString(),
      }),
    });

    submittingRef.current = false;
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to report breakdown');
      return;
    }

    router.push('/breakdowns');
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Report breakdown</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

        {/* Machine */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Machine *</label>
            <button
              type="button"
              onClick={() => { setShowNewEquipment(v => !v); setEquipmentId(''); setMachineName(''); }}
              className="text-xs text-aas-blue hover:underline flex items-center gap-0.5"
            >
              <Plus size={12} /> New machine
            </button>
          </div>

          <select
            value={equipmentId}
            onChange={e => { setEquipmentId(e.target.value); setMachineName(''); setShowNewEquipment(false); }}
            className={inputClass}
          >
            <option value="">— Select machine —</option>
            {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
          </select>

          {!equipmentId && !showNewEquipment && (
            <input
              value={machineName}
              onChange={e => setMachineName(e.target.value)}
              placeholder="Or type name if not in list"
              className={inputClass + ' mt-2'}
            />
          )}

          {showNewEquipment && (
            <div className="mt-2 p-3 rounded-lg border border-aas-blue/30 bg-aas-blue-pale space-y-2">
              <p className="text-xs font-semibold text-aas-blue">Add new machine to equipment list</p>
              <input
                value={newEquipName}
                onChange={e => setNewEquipName(e.target.value)}
                placeholder="Machine name *"
                className={inputClass}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment())}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewEquipment(false); setNewEquipName(''); }}
                  className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddEquipment}
                  disabled={savingEquip || !newEquipName.trim()}
                  className="flex-1 py-1.5 bg-aas-blue text-white rounded-lg text-xs font-medium disabled:opacity-60"
                >
                  {savingEquip ? 'Adding…' : 'Add machine'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">What&apos;s broken? *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Hydraulic oil leak, PTO shaft snapped"
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe what you found, where it is, how bad it is..."
            className={inputClass + ' resize-none'}
          />
        </div>

        {/* Cause */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cause (if known)</label>
          <input
            value={cause}
            onChange={e => setCause(e.target.value)}
            placeholder="e.g. Hit a rock, worn seal, overheating"
            className={inputClass}
          />
        </div>

        {/* Can continue */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Can it keep working?</label>
          <div className="space-y-2">
            {CAN_CONTINUE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCanContinue(opt.value)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  canContinue === opt.value
                    ? 'border-aas-blue bg-aas-blue-pale text-aas-blue font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
          <div className="grid grid-cols-4 gap-2">
            {URGENCY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={`py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${
                  urgency === opt.value ? opt.active : opt.colour + ' hover:opacity-80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date/time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">When found</label>
          <input
            type="datetime-local"
            value={reportedAt}
            onChange={e => setReportedAt(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => handlePhotos(e.target.files)}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => handlePhotos(e.target.files)}
            className="hidden"
          />

          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Two buttons: camera + gallery */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-aas-blue hover:text-aas-blue transition-colors"
            >
              <Camera size={18} /> Take photo
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-aas-blue hover:text-aas-blue transition-colors"
            >
              <ImagePlus size={18} /> Upload
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : saving ? 'Reporting…' : 'Report breakdown'}
          </button>
        </div>
      </form>
    </div>
  );
}
