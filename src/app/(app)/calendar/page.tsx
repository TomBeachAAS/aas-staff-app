import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CalendarView } from '@/components/calendar/CalendarView';
import { getEffectiveUser } from '@/lib/effective-user';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; user?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: realProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!realProfile) redirect('/login');

  const { effectiveUserId, effectiveRole } = await getEffectiveUser(
    supabase,
    user.id,
    realProfile.role,
  );

  const effectiveProfile =
    effectiveUserId === user.id
      ? realProfile
      : (await supabase.from('profiles').select('*').eq('id', effectiveUserId).single()).data ?? realProfile;

  const sp = await searchParams;
  const view = (sp.view ?? 'month') as 'day' | 'week' | 'month' | 'timeline';
  const dateStr = sp.date ?? new Date().toISOString().split('T')[0];

  let allStaff = null;
  if (['administrator', 'manager'].includes(effectiveRole)) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('status', 'active')
      .order('full_name');
    allStaff = data;
  }

  const { data: bankHolidays } = await supabase
    .from('bank_holidays')
    .select('*')
    .order('date');

  return (
    <div className="h-full flex flex-col">
      <CalendarView
        currentUserId={effectiveUserId}
        profile={effectiveProfile}
        initialView={view}
        initialDate={dateStr}
        allStaff={allStaff}
        bankHolidays={bankHolidays ?? []}
      />
    </div>
  );
}
