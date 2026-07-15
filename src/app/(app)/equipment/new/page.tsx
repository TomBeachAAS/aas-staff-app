'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';
const lbl = 'block text-sm font-medium text-gray-700 mb-1';

export default function NewEquipmentPage() {
  const router = useRouter();
  const [type, setType] = useState<'machine' | 'vehicle'>('machine');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: (fd.get('name') as string || '').trim(),
      type,
      make: (fd.get('make') as string || '').trim(),
      model: (fd.get('model') as string || '').trim(),
      year: (fd.get('year') as string || '').trim(),
      registration: type === 'vehicle' ? (fd.get('registration') as string || '').trim() : '',
      serial_no: type === 'machine' ? (fd.get('serial_no') as string || '').trim() : '',
      notes: (fd.get('notes') as string || '').trim(),
    };
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Something went wrong.'); setPending(false); }
      else { router.push('/equipment/' + json.id); }
    } catch { setError('Network error.'); setPending(false); }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Add equipment</h2>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</p>
          <div className="grid grid-cols-2 gap-3">
            {(['machine', 'vehicle'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={'py-3 rounded-xl text-sm font-semibold border-2 transition-colors capitalize ' +
                  (type === t ? 'border-aas-blue bg-aas-blue text-white' : 'border-gray-200 text-gray-500')}>
                {t === 'machine' ? 'Machine / Tool' : 'Vehicle'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {type === 'machine'
              ? 'Tractors, robots, drones, sprayers, telehandlers, tools…'
              : 'Cars, vans, trucks that drive on public roads'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</p>
          <div>
            <label className={lbl}>Name *</label>
            <input name="name" required
              placeholder={type === 'vehicle' ? 'e.g. Transit Van 1' : 'e.g. Robotti 150F #1'}
              className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Make</label>
              <input name="make" placeholder={type === 'vehicle' ? 'Ford' : 'Agrointelli'} className={inp} />
            </div>
            <div>
              <label className={lbl}>Model</label>
              <input name="model" placeholder={type === 'vehicle' ? 'Transit Custom' : 'Robotti 150F'} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Year</label>
            <input name="year" type="number" min="1990" max="2099" placeholder="e.g. 2023" className={inp} />
          </div>
          {type === 'vehicle' ? (
            <div>
              <label className={lbl}>Registration</label>
              <input name="registration" placeholder="e.g. AB12 CDE" className={inp} style={{textTransform:'uppercase'}} />
            </div>
          ) : (
            <div>
              <label className={lbl}>Serial number</label>
              <input name="serial_no" placeholder="e.g. SN-2024-001" className={inp} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className={lbl}>Notes</label>
          <textarea name="notes" rows={3} placeholder="Any additional info, colour, attachments…" className={inp} />
        </div>

        <button type="submit" disabled={pending}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {pending ? 'Saving…' : 'Add ' + (type === 'machine' ? 'machine' : 'vehicle')}
        </button>
      </form>
    </div>
  );
}
