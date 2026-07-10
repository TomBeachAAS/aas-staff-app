import { logout } from '@/lib/auth-actions';
import { Clock } from 'lucide-react';

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-aas-blue-pale flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-4">
          <Clock className="text-amber-600" size={28} />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Awaiting approval</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your account has been created and is waiting for an administrator to approve it.
          You&apos;ll be able to sign in once your account is activated.
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-aas-blue hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
