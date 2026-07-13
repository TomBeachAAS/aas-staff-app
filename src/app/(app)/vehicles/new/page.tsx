'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export default function NewVehiclePage() {
  const router = useRouter();
  const [type, setType] = useState<'vehicle' | 'machine'>('vehicle');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setPending(true);
    const data = new FormData(e.currentTarget);
    const body = {
      name: (data.get('name') as string || '').trim(),
      type,
      registration: (data.get('registration') as string || '').trim(),
      make: (data.get('make') as string || '').trim(),
      model: (data.get('model') as string || '').trim(),
      year: (data.get('year') as string || '').trim(),
      notes: (data.get('notes') as string || '').trim(),
    };
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Something went wrong.'); }
      else { router.push('/vehicles/' + json.id); }
    } catch { setError('Network error. Please try again.'); }
    finally { setPending(false); }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/vehicles" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Add vehicle or machine</h2>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setType('vehicle')}
              className={'py-3 rounded-xl text-sm font-semibold border-2 transition-colors ' +
                (type === 'vehicle' ? 'border-aas-blue bg-aas-blue text-white' : 'border-gray-200 text-gray-500')}>
              Vehicle
            </button>
            <button type="button" onClick={() => setType('machine')}
              className={'py-3 rounded-xl text-sm font-semibold border-2 transition-colors ' +
                (type === 'machine' ? 'border-aas-blue bg-aas-blue text-white' : 'border-gray-200 text-gray-500')}>
              Machine
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</p>
          <div>
            <label className={labelCls}>Name *</label>
            <input name="name" required placeholder={type === 'vehicle' ? 'e.g. Transit Van 1' : 'e.g. Robotti 150F #1'} className={inputCls} />
          </div>
          {type === 'vehicle' && (
            <div>
              <label className={labelCls}>Registration</label>
              <input name="registration" placeholder="e.g. AB12 CDE" className={inputCls} />
            </div>
          )}
          <div>
            <label className={labelCls}>Make</label>
            <input name="make" placeholder={type === 'vehicle' ? 'e.g. Ford' : 'e.g. Agrointelli'} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Model</label>
            <input name="model" placeholder={type === 'vehicle' ? 'e.g. Transit' : 'e.g. Robotti 150F'} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <input name="year" type="number" min="1990" max="2099" placeholder="e.g. 2023" className={inputCls} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className={labelCls}>Notes</label>
          <textarea name="notes" rows={3} placeholder="Any additional info..." className={inputCls} />
        </div>

        <button type="submit" disabled={pending}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {pending ? 'Saving...' : 'Add ' + type}
        </button>

      </form>
    </div>
  );
}
