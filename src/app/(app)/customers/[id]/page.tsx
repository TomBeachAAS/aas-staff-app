import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Phone, Mail, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManager = ['administrator', 'manager'].includes(viewer?.role ?? '');

  const { data: customer } = await supabase.from('customers').select('*').eq('id', id).single();
  if (!customer) notFound();

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <h2 className="text-lg font-bold text-gray-800">{customer.name}</h2>
        </div>
        {isManager && (
          <Link
            href={'/customers/' + id + '/edit'}
            className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium"
          >
            <Pencil size={14} />
            Edit
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        {customer.contact_name && (
          <div>
            <p className="text-xs text-gray-400">Contact</p>
            <p className="text-sm font-medium text-gray-800">{customer.contact_name}</p>
          </div>
        )}
        {customer.email && (
          <a href={'mailto:' + customer.email} className="flex items-center gap-2 text-sm text-aas-blue">
            <Mail size={15} />
            {customer.email}
          </a>
        )}
        {customer.phone && (
          <a href={'tel:' + customer.phone} className="flex items-center gap-2 text-sm text-aas-blue">
            <Phone size={15} />
            {customer.phone}
          </a>
        )}
        {(customer.address || customer.city || customer.postcode) && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
            <span>
              {[customer.address, customer.city, customer.postcode].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {customer.notes && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs text-gray-400 mb-1">Status</p>
        <span className={'text-xs font-medium px-2 py-1 rounded-full ' +
          (customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
          {customer.status ?? 'active'}
        </span>
      </div>
    </div>
  );
}
