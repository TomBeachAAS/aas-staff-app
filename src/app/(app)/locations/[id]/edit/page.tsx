'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const textareaCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

export default function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [loc, setLoc] = useState<any>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetch('/api/locations/' + p.id)
        .then(r => r.json())
        .then(data => { setLoc(data); setLoading(false); })
        .catch(() => { setError('Failed to load location.'); setLoading(false); });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setPending(true);

    const data = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    data.forEach((v, k) => { body[k] = (v as string).trim(); });

    try {
      const res = await fetch('/api/locations/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Something went wrong.');
      } else {
        router.push('/locations/' + id);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-400">Loading...</div>;
  if (!loc) return <div className="p-4 text-sm text-red-500">{error || 'Location not found.'}</div>;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={'/locations/' + id} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Edit location</h2>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Location details</p>
          <div>
            <label className={labelCls}>Location name *</label>
            <input name="name" required defaultValue={loc.name ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Site contact</label>
            <input name="site_contact" defaultValue={loc.site_contact ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Site phone</label>
            <input name="site_phone" type="tel" defaultValue={loc.site_phone ?? ''} className={inputCls} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Address</p>
          <div>
            <label className={labelCls}>Address line 1</label>
            <input name="address_line1" defaultValue={loc.address_line1 ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Address line 2</label>
            <input name="address_line2" defaultValue={loc.address_line2 ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Town</label>
            <input name="town" defaultValue={loc.town ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>County</label>
            <input name="county" defaultValue={loc.county ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Postcode</label>
            <input name="postcode" defaultValue={loc.postcode ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input name="country" defaultValue={loc.country ?? 'UK'} className={inputCls} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Coordinates & What3Words</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Latitude</label>
              <input name="latitude" type="number" step="any" defaultValue={loc.latitude ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input name="longitude" type="number" step="any" defaultValue={loc.longitude ?? ''} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>What3Words address</label>
            <input
              name="what3words"
              defaultValue={loc.what3words ?? ''}
              placeholder="e.g. filled.count.soap"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Enter without /// — e.g. word.word.word</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</p>
          <div>
            <label className={labelCls}>Access notes</label>
            <textarea name="access_notes" rows={2} defaultValue={loc.access_notes ?? ''} className={textareaCls} />
          </div>
          <div>
            <label className={labelCls}>Parking notes</label>
            <textarea name="parking_notes" rows={2} defaultValue={loc.parking_notes ?? ''} className={textareaCls} />
          </div>
          <div>
            <label className={labelCls}>Health & safety notes</label>
            <textarea name="health_safety_notes" rows={2} defaultValue={loc.health_safety_notes ?? ''} className={textareaCls} />
          </div>
          <div>
            <label className={labelCls}>General notes</label>
            <textarea name="general_notes" rows={2} defaultValue={loc.general_notes ?? ''} className={textareaCls} />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60"
        >
          {pending ? 'Saving...' : 'Save changes'}
        </button>

      </form>
    </div>
  );
}
