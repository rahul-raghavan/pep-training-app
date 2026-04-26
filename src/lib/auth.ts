import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuthUser = {
  id: string;        // auth.users id
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  name: string | null;
  traineeId: string | null;
  isActive: boolean;
  /** Admin scope: primary/legacy center this admin manages. NULL for super_admin/user. */
  adminScopeCenterId: string | null;
  /** Admin scope: centers this admin manages. Empty for super_admin/user. */
  adminScopeCenterIds: string[];
  /** Admin scope: which program tracks this admin manages within their center. */
  adminScopeTrackIds: string[];
};

type AuthResult = { user: AuthUser; error: null } | { user: null; error: NextResponse };

/**
 * Read Supabase session from request cookies and fetch the profile + linked traineeId.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthResult> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // API routes don't need to set cookies — middleware handles refresh
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  const admin = createAdminClient();

  // Fetch profile (with admin scope columns when available — fall back if migration pending)
  let profile: {
    role: string;
    name: string | null;
    is_active: boolean;
    admin_scope_center_id?: string | null;
    admin_scope_center_ids?: string[] | null;
    admin_scope_track_ids?: string[] | null;
  } | null = null;

  const full = await admin
    .from('profiles')
    .select('role, name, is_active, admin_scope_center_id, admin_scope_center_ids, admin_scope_track_ids')
    .eq('id', user.id)
    .single();
  if (full.data) {
    profile = full.data;
  } else if (full.error?.code === '42703') {
    const fallback = await admin
      .from('profiles')
      .select('role, name, is_active')
      .eq('id', user.id)
      .single();
    profile = fallback.data;
  }

  if (!profile) {
    return { user: null, error: NextResponse.json({ error: 'Profile not found' }, { status: 401 }) };
  }

  if (!profile.is_active) {
    return { user: null, error: NextResponse.json({ error: 'Account deactivated' }, { status: 403 }) };
  }

  // Fetch linked trainee ID
  const { data: trainee } = await admin
    .from('trainees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const adminScopeCenterIds =
    profile.admin_scope_center_ids && profile.admin_scope_center_ids.length > 0
      ? profile.admin_scope_center_ids
      : profile.admin_scope_center_id
        ? [profile.admin_scope_center_id]
        : [];

  return {
    user: {
      id: user.id,
      email: user.email!,
      role: profile.role as AuthUser['role'],
      name: profile.name,
      traineeId: trainee?.id ?? null,
      isActive: profile.is_active,
      adminScopeCenterId: adminScopeCenterIds[0] ?? null,
      adminScopeCenterIds,
      adminScopeTrackIds: profile.admin_scope_track_ids ?? [],
    },
    error: null,
  };
}

/** Any logged-in user with an active account. */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  return getAuthUser(request);
}

/** Admin or super_admin only. */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const result = await getAuthUser(request);
  if (result.error) return result;

  if (result.user.role !== 'admin' && result.user.role !== 'super_admin') {
    return { user: null, error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return result;
}

/** Super admin only. */
export async function requireSuperAdmin(request: NextRequest): Promise<AuthResult> {
  const result = await getAuthUser(request);
  if (result.error) return result;

  if (result.user.role !== 'super_admin') {
    return { user: null, error: NextResponse.json({ error: 'Super admin access required' }, { status: 403 }) };
  }
  return result;
}
