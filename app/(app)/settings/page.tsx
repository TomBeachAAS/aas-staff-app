import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'administrator') redirect('/dashboard');

  const { data: settings } = await supabase
    .from('company_settings')
    .select('*')
    .order('key');

  const settingsMap: Record<string, string> = {};
  (settings ?? []).forEach(s => { settingsMap[s.key] = s.value; });

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-gray-800">Company settings</h2>
      <SettingsForm settings={settingsMap} adminId={user.id} />
    </div>
  );
}
