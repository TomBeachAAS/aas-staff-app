import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewMileageForm } from '@/components/expenses/NewMileageForm';

export default async function NewMileagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rateRow } = await supabase
    .from('company_settings')
    .select('value')
    .eq('key', 'mileage_rate_per_mile')
    .single();

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-5">New mileage claim</h2>
      <NewMileageForm userId={user.id} ratePerMile={parseFloat(rateRow?.value ?? '0.45')} />
    </div>
  );
}
