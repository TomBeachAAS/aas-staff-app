'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export default function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [v, setV] = useState<any>(null);
  const [type, setType] = useState<'vehicle' | 'machine'>('vehicle');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetch('/api/vehicles/' + p.id)
        .then(r => r.json())
        .then(data => {
          setV(data);
          setType(data.type === 'machine' ? 'machine' : 'vehicle');
          setLoading(false);
        });
    });
  }, []);

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
      is_active: v?.is_active,
    };
    try {
      const res = await fetch('/api/vehicles/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Something went wrong.'); }
      else { router.push('/vehicles/' + id); }
    } catch { setError('Network error. Please try again.'); }
    finally { setPending(false); }
  }

  if (loading) return <div className="p-4 text-sm text-gray-400">Loading...</div>;
  if (!v) return <div className="p-4 text-sm text-red-500">Not found.</div>;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={'/vehicles/' + id} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Edit {type}</h2>
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
            <input name="name" required defaultValue={v.name ?? ''} className={inputCls} />
          </div>
          {type === 'vehicle' && (
            <div>
              <label className={labelCls}>Registration</label>
              <input name="registration" defaultValue={v.registration ?? ''} className={inputCls} />
            </div>
          )}
          <div>
            <label className={labelCls}>Make</label>
            <input name="make" defaultValue={v.make ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Model</label>
            <input name="model" defaultValue={v.model ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <input name="year" type="number" min="1990" max="2099" defaultValue={v.year ?? ''} className={inputCls} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked={v.is_active}
              onChange={e => setV((prev: any) => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 rounded text-aas-blue" />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className={labelCls}>Notes</label>
          <textarea name="notes" rows={3} defaultValue={v.notes ?? ''} className={inputCls} />
        </div>

        <button type="submit" disabled={pending}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {pending ? 'Saving...' : 'Save changes'}
        </button>

      </form>
    </div>
  );
}
