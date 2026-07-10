import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CalendarView } from '@/components/calendar/CalendarView';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; user?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const sp = await searchParams;
  const view = (sp.view ?? 'month') as 'day' | 'week' | 'month' | 'timeline';
  const dateStr = sp.date ?? new Date().toISOString().split('T')[0];

  // Load all active staff for manager timeline view
  let allStaff = null;
  if (['administrator', 'manager'].includes(profile.role)) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('status', 'active')
      .order('full_name');
    allStaff = data;
  }

  // Bank holidays
  const { data: bankHolidays } = await supabase
    .from('bank_holidays')
    .select('*')
    .order('date');

  return (
    <div className="h-full flex flex-col">
      <CalendarView
        currentUserId={user.id}
        profile={profile}
        initialView={view}
        initialDate={dateStr}
        allStaff={allStaff}
        bankHolidays={bankHolidays ?? []}
      />
    </div>
  );
}
