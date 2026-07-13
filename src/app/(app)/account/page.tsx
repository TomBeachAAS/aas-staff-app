import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CalendarFeedCard } from './CalendarFeedCard';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, calendar_token')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aas-staff-app.vercel.app';
  const feedUrl = `${origin}/api/calendar/${profile.calendar_token}`;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-gray-800">My account</h2>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700">{profile.full_name}</p>
        <p className="text-sm text-gray-500">{profile.email}</p>
        <span className="inline-block text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
          {profile.role}
        </span>
      </div>

      <CalendarFeedCard feedUrl={feedUrl} userId={user.id} />
    </div>
  );
}
