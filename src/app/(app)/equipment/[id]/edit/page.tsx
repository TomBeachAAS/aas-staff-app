'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';
const lbl = 'block text-sm font-medium text-gray-700 mb-1';

export default function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [type, setType] = useState<'machine' | 'vehicle'>('machine');
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState({ name: '', make: '', model: '', year: '', registration: '', serial_no: '', notes: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    params.then(async p => {
      setId(p.id);
      const res = await fetch('/api/equipment/' + p.id);
      if (res.ok) {
        const d = await res.json();
        setType(d.type === 'vehicle' ? 'vehicle' : 'machine');
        setIsActive(d.is_active ?? true);
        setFields({
          name: d.name || '',
          make: d.make || '',
          model: d.model || '',
          year: d.year ? String(d.year) : '',
          registration: d.registration || '',
          serial_no: d.serial_no || '',
          notes: d.notes || '',
        });
      }
      setLoading(false);
    });
  }, []);

  function field(key: keyof typeof fields) {
    return { value: fields[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFields(f => ({ ...f, [key]: e.target.value })) };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const res = await fetch('/api/equipment/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, type, is_active: isActive }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Something went wrong.'); setPending(false); }
      else { router.push('/equipment/' + id); }
    } catch { setError('Network error.'); setPending(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/equipment/' + id, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Delete failed.'); setDeleting(false); setShowDeleteConfirm(false); }
      else { router.push('/equipment'); }
    } catch { setError('Network error.'); setDeleting(false); setShowDeleteConfirm(false); }
  }

  if (loading) return <div className="p-4 text-sm text-gray-400">Loading…</div>;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={'/equipment/' + id} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Edit equipment</h2>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</p>
          <div className="grid grid-cols-2 gap-3">
            {(['machine', 'vehicle'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={'py-3 rounded-xl text-sm font-semibold border-2 transition-colors ' +
                  (type === t ? 'border-aas-blue bg-aas-blue text-white' : 'border-gray-200 text-gray-500')}>
                {t === 'machine' ? 'Machine / Tool' : 'Vehicle'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</p>
          <div>
            <label className={lbl}>Name *</label>
            <input required className={inp} {...field('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Make</label>
              <input className={inp} {...field('make')} />
            </div>
            <div>
              <label className={lbl}>Model</label>
              <input className={inp} {...field('model')} />
            </div>
          </div>
          <div>
            <label className={lbl}>Year</label>
            <input type="number" min="1990" max="2099" className={inp} {...field('year')} />
          </div>
          <div>
            <label className={lbl}>Registration</label>
            <input className={inp} style={{textTransform:'uppercase'}} {...field('registration')} />
          </div>
          <div>
            <label className={lbl}>Serial number</label>
            <input className={inp} {...field('serial_no')} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className={lbl}>Notes</label>
          <textarea rows={3} className={inp} {...field('notes')} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded w-4 h-4" />
            <span className="text-sm text-gray-700">Active — visible in lists and task picker</span>
          </label>
        </div>

        <button type="submit" disabled={pending}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full py-3 border border-red-200 text-red-500 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={15} />
        Delete equipment
      </button>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-gray-800">Delete equipment?</h3>
            <p className="text-sm text-gray-500">This cannot be undone. Any tasks linked to this equipment will lose the link.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
