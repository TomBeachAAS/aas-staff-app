import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const { data: customers } = await supabase
    .from('customers')
    .select('*, locations:locations(id)')
    .eq('is_active', true)
    .order('company_name');

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Customers</h2>
        {isManagerOrAdmin && (
          <Link href="/customers/new" className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark">
            <Plus size={16} />
            Add customer
          </Link>
        )}
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {(customers ?? []).length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No customers yet</div>
          ) : (
            (customers ?? []).map(c => (
              <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-aas-blue-pale flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-aas-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.company_name}</p>
                  {c.contact_name && <p className="text-xs text-gray-400">{c.contact_name}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {(c.locations as {id: string}[])?.length ?? 0} site{(c.locations as {id: string}[])?.length !== 1 ? 's' : ''}
                </span>
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
