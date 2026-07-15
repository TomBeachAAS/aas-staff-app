import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewTaskForm } from '@/components/tasks/NewTaskForm';

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sp = await searchParams;

  const [
    { data: staff },
    { data: customers },
    { data: locations },
    { data: equipment },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('status', 'active').order('full_name'),
    supabase.from('customers').select('id, company_name').eq('is_active', true).order('company_name'),
    supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
    supabase.from('equipment').select('id, name, type, registration').eq('is_active', true).order('name'),
  ]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-5">New task</h2>
      <NewTaskForm
        userId={user.id}
        initialDate={sp.date}
        staff={staff ?? []}
        customers={customers ?? []}
        locations={locations ?? []}
        equipment={equipment ?? []}
      />
    </div>
  );
}
