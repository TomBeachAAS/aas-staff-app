'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export default function NewCustomerPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setPending(true);

    const data = new FormData(e.currentTarget);
    const body = {
      name: (data.get('name') as string || '').trim(),
      contact_name: (data.get('contact_name') as string || '').trim(),
      email: (data.get('email') as string || '').trim(),
      phone: (data.get('phone') as string || '').trim(),
      address: (data.get('address') as string || '').trim(),
      city: (data.get('city') as string || '').trim(),
      postcode: (data.get('postcode') as string || '').trim(),
      notes: (data.get('notes') as string || '').trim(),
    };

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Something went wrong.');
      } else {
        router.push('/customers/' + json.id);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Add customer</h2>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Company details</p>
          <div>
            <label className={labelCls}>Company / farm name *</label>
            <input name="name" required placeholder="e.g. Greenfield Farm Ltd" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact name</label>
            <input name="contact_name" placeholder="e.g. John Smith" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input name="email" type="email" placeholder="john@example.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input name="phone" type="tel" placeholder="+44 7700 900000" className={inputCls} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Address</p>
          <div>
            <label className={labelCls}>Street address</label>
            <input name="address" placeholder="e.g. 123 Farm Lane" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>City / town</label>
            <input name="city" placeholder="e.g. Cambridge" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Postcode</label>
            <input name="postcode" placeholder="e.g. CB1 2AB" className={inputCls} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</p>
          <textarea
            name="notes"
            placeholder="Any additional information..."
            rows={3}
            className={inputCls}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60"
        >
          {pending ? 'Saving...' : 'Add customer'}
        </button>

      </form>
    </div>
  );
}
