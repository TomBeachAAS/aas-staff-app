import { stopImpersonation } from '@/app/actions/impersonation';

export function ImpersonationBanner({ name }: { name: string }) {
  return (
    <div className="bg-amber-400 px-4 py-2 flex items-center justify-between shrink-0">
      <p className="text-sm font-medium text-amber-900">
        👁 Viewing as <strong>{name}</strong>
      </p>
      <form action={stopImpersonation}>
        <button type="submit" className="px-3 py-1 bg-amber-900/20 border border-amber-900/30 text-amber-900 rounded-lg text-xs font-semibold hover:bg-amber-900/30 transition-colors">
          Exit
        </button>
      </form>
    </div>
  );
}
