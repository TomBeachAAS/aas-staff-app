'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CheckCircle2, XCircle } from 'lucide-react';

type Perms = { timesheet_access: boolean; expenses_access: boolean; holiday_access: boolean };

export function StaffPermissions() {
  const pathname = usePathname();
  const staffId = pathname.split('/').at(-1);
  const [perms, setPerms] = useState<Perms | null>(null);

  useEffect(() => {
    if (!staffId) return;
    const supabase = createClient();
    supabase.from('profiles')
      .select('timesheet_access, expenses_access, holiday_access')
      .eq('id', staffId)
      .single()
      .then(({ data }) => { if (data) setPerms(data as Perms); });
  }, [staffId]);

  if (!perms) return null;

  return (
    <div className="px-4 pb-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Permissions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <PermRow label="Timesheets" enabled={!!perms.timesheet_access} />
          <PermRow label="Expenses" enabled={!!perms.expenses_access} />
          <PermRow label="Holidays" enabled={!!perms.holiday_access} />
        </CardContent>
      </Card>
    </div>
  );
}

function PermRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      {enabled ? (
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <CheckCircle2 size={14} /> Enabled
        </span>
      ) : (
        <span className="flex items-center gap-1 text-gray-400 font-medium">
          <XCircle size={14} /> Disabled
        </span>
      )}
    </div>
  );
}
