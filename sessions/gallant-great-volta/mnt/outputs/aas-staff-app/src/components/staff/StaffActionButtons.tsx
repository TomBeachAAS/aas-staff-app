'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserStatus, UserRole } from '@/types/database';

interface Props {
  staffId: string;
  currentStatus: UserStatus;
  currentRole: UserRole;
}

export function StaffActionButtons({ staffId, currentStatus, currentRole }: Props) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: UserStatus) {
    setLoading(true);
    const supabase = createClient();
    await supabase.from('profiles').update({ status }).eq('id', staffId);
    router.refresh();
    setLoading(false);
  }

  async function updateRole() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from('profiles').update({ role }).eq('id', staffId);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-3 bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-sm font-semibold text-gray-700">Admin actions</p>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="employee">Employee</option>
            <option value="contractor">Contractor</option>
            <option value="manager">Manager</option>
            <option value="administrator">Administrator</option>
          </select>
        </div>
        <button onClick={updateRole} disabled={loading || role === currentRole} className="px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-50">Save role</button>
      </div>

      <div className="flex gap-2">
        {currentStatus !== 'active' && (
          <button onClick={() => updateStatus('active')} disabled={loading} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            Activate account
          </button>
        )}
        {currentStatus !== 'disabled' && (
          <button onClick={() => updateStatus('disabled')} disabled={loading} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            Deactivate account
          </button>
        )}
      </div>
    </div>
  );
}
