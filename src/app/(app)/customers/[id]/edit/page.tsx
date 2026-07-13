import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import EditCustomerForm from './EditCustomerForm';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['administrator', 'manager'].includes(viewer?.role ?? '')) redirect('/dashboard');

  const { data: customer } = await supabase.from('customers').select('*').eq('id', id).single();
  if (!customer) notFound();

  return <EditCustomerForm customer={customer} />;
}
