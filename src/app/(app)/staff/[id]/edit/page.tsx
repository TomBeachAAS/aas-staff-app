import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { StaffEditForm } from '@/components/staff/StaffEditForm';

export const dynamic = 'force-dynamic';

export default async function StaffEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (viewer?.role !== 'administrator') redirect('/staff/' + id);

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (!profile) notFound();

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Link href={'/staff/' + id} className="text-sm text-aas-blue hover:underline">
          ← Back to profile
        </Link>
      </div>
      <h2 className="text-lg font-bold text-gray-800">Edit — {profile.full_name}</h2>
      <StaffEditForm profile={profile} />
    </div>
  );
}
