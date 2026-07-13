'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';

export default function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [v, setV] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetch('/api/vehicles/' + p.id)
        .then(r => r.json())
        .then(data => { setV(data); setLoading(false); });
    });
    fetch('/api/auth/role')
      .then(r => r.json())
      .then(d => setIsManager(['administrator', 'manager'].includes(d.role)));
  }, []);

  if (loading) return <div className="p-4 text-sm text-gray-400">Loading...</div>;
  if (!v || v.error) return <div className="p-4 text-sm text-red-500">Not found.</div>;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vehicles" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{v.name}</h2>
            <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' +
              (v.type === 'machine' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
              {v.type === 'machine' ? 'Machine' : 'Vehicle'}
            </span>
          </div>
        </div>
        {isManager && (
          <Link href={'/vehicles/' + id + '/edit'}
            className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium">
            <Pencil size={14} />
            Edit
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        {v.registration && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Registration</span>
            <span className="font-semibold text-gray-800 tracking-wider">{v.registration}</span>
          </div>
        )}
        {v.make && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Make</span>
            <span className="text-gray-800">{v.make}</span>
          </div>
        )}
        {v.model && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Model</span>
            <span className="text-gray-800">{v.model}</span>
          </div>
        )}
        {v.year && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Year</span>
            <span className="text-gray-800">{v.year}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Status</span>
          <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' +
            (v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
            {v.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {v.notes && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.notes}</p>
        </div>
      )}

    </div>
  );
}
