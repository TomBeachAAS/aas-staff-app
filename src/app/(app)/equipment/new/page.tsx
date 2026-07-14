'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewEquipmentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<'machine' | 'vehicle'>('machine');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('equipment')
      .insert({ name: name.trim(), type, description: description.trim() || null })
      .select('id')
      .single();
    if (data) router.push(`/equipment/${data.id}`);
    else setSaving(false);
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h2 className="text-lg font-bold text-gray-800">Add equipment</h2>
      <form onSubmit={submit} className="space-y-4 bg-white rounded-xl border border-gray-100 p-4">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Name</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. JCB Telehandler, Ford Transit"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
          <div className="flex gap-2">
            {(['machine', 'vehicle'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === t
                    ? 'bg-aas-blue text-white border-aas-blue'
                    : 'border-gray-200 text-gray-500 hover:border-aas-blue'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Description <span className="text-gray-300 font-normal">(optional)</span>
          </label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Red Massey 135, reg DF06 XYZ"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Adding…' : 'Add equipment'}
        </button>
      </form>
      <button onClick={() => router.back()} className="text-sm text-aas-blue hover:underline">← Cancel</button>
    </div>
  );
}
