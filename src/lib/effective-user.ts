import { cookies } from 'next/headers';

export interface EffectiveUser {
  effectiveUserId: string;
  effectiveRole: string;
  isImpersonating: boolean;
}

export async function getEffectiveUser(
  supabase: any,
  realUserId: string,
  realRole: string,
): Promise<EffectiveUser> {
  if (realRole !== 'administrator') {
    return { effectiveUserId: realUserId, effectiveRole: realRole, isImpersonating: false };
  }

  const cookieStore = await cookies();
  const impersonateId = cookieStore.get('impersonate_user_id')?.value;

  if (!impersonateId || impersonateId === realUserId) {
    return { effectiveUserId: realUserId, effectiveRole: realRole, isImpersonating: false };
  }

  const { data: impersonated } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', impersonateId)
    .single();

  if (!impersonated) {
    return { effectiveUserId: realUserId, effectiveRole: realRole, isImpersonating: false };
  }

  return {
    effectiveUserId: impersonated.id,
    effectiveRole: impersonated.role,
    isImpersonating: true,
  };
}
