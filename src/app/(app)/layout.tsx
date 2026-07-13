import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status === 'pending') redirect('/pending');
  if (profile.status === 'disabled') redirect('/login');

  // Impersonation — admins only
  let effectiveProfile = profile;
  let impersonatedName: string | null = null;

  if (profile.role === 'administrator') {
    const cookieStore = await cookies();
    const impersonateId = cookieStore.get('impersonate_user_id')?.value;
    if (impersonateId && impersonateId !== user.id) {
      const { data: impersonated } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', impersonateId)
        .single();
      if (impersonated) {
        effectiveProfile = impersonated;
        impersonatedName = impersonated.full_name;
      }
    }
  }

  // Unread notifications for the effective user
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', effectiveProfile.id)
    .eq('is_read', false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={effectiveProfile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {impersonatedName && <ImpersonationBanner name={impersonatedName} />}
        <TopBar profile={effectiveProfile} unreadCount={unreadCount ?? 0} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
