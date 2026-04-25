import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_DOMAINS = ['pepschoolv2.com', 'accelschool.in', 'ribbons.education'];
const SUPER_ADMIN_EMAILS = [
  'rahul@pepschoolv2.com',
  'chetan@pepschoolv2.com',
  'founders.office@pepschoolv2.com',
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Exchange the code for a session
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData.user) {
    console.error('Auth callback error:', sessionError);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = sessionData.user;
  const email = user.email?.toLowerCase();

  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=no_email`);
  }

  // Check domain
  const domain = email.split('@')[1];
  if (!ALLOWED_DOMAINS.includes(domain)) {
    // Sign them out since they're not allowed
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`);
  }

  // Use admin client for DB operations (bypasses RLS)
  const admin = createAdminClient();

  // Check if profile already exists
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  let role: string;

  if (existingProfile) {
    // Existing user — check if active
    if (!existingProfile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=account_deactivated`);
    }
    role = existingProfile.role;
  } else {
    // First login — create profile
    const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];

    // Determine role + read any pre-assigned admin scope from the trainee row.
    // Admin scope columns may not exist yet (migration pending) — handle gracefully.
    let preAssignedAdminScope: string[] = [];
    let preRegisteredTraineeId: string | null = null;

    if (SUPER_ADMIN_EMAILS.includes(email)) {
      role = 'super_admin';
      // Still pick up any prior trainee row to link.
      const { data: preRegistered } = await admin
        .from('trainees')
        .select('id')
        .eq('email', email)
        .is('user_id', null)
        .single();
      preRegisteredTraineeId = preRegistered?.id ?? null;
    } else {
      // Try to read both pre_assigned_role and pre_assigned_admin_scope_track_ids.
      // Older DBs without the migration won't have the latter column — fall back.
      let preRegistered: {
        id: string;
        pre_assigned_role: string | null;
        pre_assigned_admin_scope_track_ids: string[] | null;
      } | null = null;

      const full = await admin
        .from('trainees')
        .select('id, pre_assigned_role, pre_assigned_admin_scope_track_ids')
        .eq('email', email)
        .not('pre_assigned_role', 'is', null)
        .single();
      if (full.data) {
        preRegistered = full.data;
      } else if (full.error?.code === '42703') {
        // Column missing → retry without it.
        const fallback = await admin
          .from('trainees')
          .select('id, pre_assigned_role')
          .eq('email', email)
          .not('pre_assigned_role', 'is', null)
          .single();
        if (fallback.data) {
          preRegistered = {
            id: fallback.data.id,
            pre_assigned_role: fallback.data.pre_assigned_role,
            pre_assigned_admin_scope_track_ids: null,
          };
        }
      }

      if (preRegistered?.pre_assigned_role) {
        role = preRegistered.pre_assigned_role;
        preAssignedAdminScope = preRegistered.pre_assigned_admin_scope_track_ids ?? [];
        preRegisteredTraineeId = preRegistered.id;
      } else {
        role = 'user';
      }
    }

    // Resolve admin scope center from teacher_centers (if migration applied
    // and the trainee has a center mapping). Best-effort.
    let adminScopeCenterId: string | null = null;
    if (role === 'admin' && preRegisteredTraineeId) {
      const { data: tc, error: tcError } = await admin
        .from('teacher_centers')
        .select('center_id')
        .eq('trainee_id', preRegisteredTraineeId)
        .single();
      if (!tcError && tc) {
        adminScopeCenterId = tc.center_id;
      }
    }

    // Build the profile insert. Try with the new admin scope columns first;
    // if profile schema is older, fall back to the basic insert.
    const profileBase: Record<string, unknown> = {
      id: user.id,
      email,
      name,
      role,
    };
    const profileWithScope: Record<string, unknown> = {
      ...profileBase,
      admin_scope_center_id: role === 'admin' ? adminScopeCenterId : null,
      admin_scope_track_ids: role === 'admin' ? preAssignedAdminScope : [],
    };

    let { error: profileError } = await admin.from('profiles').insert(profileWithScope);
    if (profileError?.code === '42703') {
      const retry = await admin.from('profiles').insert(profileBase);
      profileError = retry.error;
    }

    if (profileError) {
      console.error('Failed to create profile:', profileError);
      return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`);
    }

    // Clear pre_assigned_role + pre_assigned_admin_scope_track_ids on the trainee
    // (one-time use). If the column doesn't exist, only clear pre_assigned_role.
    if (preRegisteredTraineeId) {
      const clearWithScope = await admin
        .from('trainees')
        .update({
          pre_assigned_role: null,
          pre_assigned_admin_scope_track_ids: [],
          user_id: user.id,
        })
        .eq('id', preRegisteredTraineeId);
      if (clearWithScope.error?.code === '42703') {
        await admin
          .from('trainees')
          .update({ pre_assigned_role: null, user_id: user.id })
          .eq('id', preRegisteredTraineeId);
      }
    } else {
      // No pre-registration row — create a fresh trainee linked to this user.
      await admin.from('trainees').insert({
        name,
        email,
        access_token: uuidv4(),
        user_id: user.id,
      });
    }
  }

  // Redirect based on role
  if (role === 'super_admin' || role === 'admin') {
    return NextResponse.redirect(`${origin}/admin/dashboard`);
  }
  return NextResponse.redirect(`${origin}/learn`);
}
