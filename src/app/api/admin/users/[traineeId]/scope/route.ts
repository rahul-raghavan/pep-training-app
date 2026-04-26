import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';
import { isTraineeInAdminScope } from '@/lib/admin-scope';

interface UserScopeResponse {
  trainee: {
    id: string;
    name: string;
    email: string;
    userId: string | null;        // null = pending (hasn't signed in yet)
  };
  centerId: string | null;
  centerIds: string[];
  programTrackIds: string[];
  role: 'super_admin' | 'admin' | 'user';
  adminScopeCenterIds: string[];
  adminScopeTrackIds: string[];
}

const VALID_ROLES = ['user', 'admin', 'super_admin'] as const;

function isMissingColumnError(
  error: { code?: string; message?: string; details?: string } | null | undefined,
  column: string
): boolean {
  return Boolean(
    error &&
      (error.code === '42703' ||
        error.code === 'PGRST204' ||
        error.message?.includes(column) ||
        error.details?.includes(column))
  );
}

/**
 * GET /api/admin/users/[traineeId]/scope
 * Returns the current center / program tracks / role / admin-scope for a user.
 * For pending users (not yet signed in) the role comes from
 * `trainees.pre_assigned_role`; for active users it comes from `profiles.role`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ traineeId: string }> }
) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { traineeId } = await params;
  const supabase = createAdminClient();

  let trainee: {
    id: string;
    name: string;
    email: string | null;
    user_id: string | null;
    pre_assigned_role: string | null;
    pre_assigned_admin_scope_center_ids?: string[] | null;
    pre_assigned_admin_scope_track_ids?: string[] | null;
  } | null = null;

  const fullTrainee = await supabase
    .from('trainees')
    .select('id, name, email, user_id, pre_assigned_role, pre_assigned_admin_scope_center_ids, pre_assigned_admin_scope_track_ids')
    .eq('id', traineeId)
    .single();
  if (fullTrainee.data) {
    trainee = fullTrainee.data;
  } else if (isMissingColumnError(fullTrainee.error, 'pre_assigned_admin_scope_center_ids')) {
    const fallback = await supabase
      .from('trainees')
      .select('id, name, email, user_id, pre_assigned_role, pre_assigned_admin_scope_track_ids')
      .eq('id', traineeId)
      .single();
    trainee = fallback.data;
  }

  if (!trainee) {
    return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
  }
  if (!(await isTraineeInAdminScope(supabase, user, traineeId))) {
    return NextResponse.json({ error: 'Trainee is not in your admin scope' }, { status: 403 });
  }

  // Center
  const { data: tc } = await supabase
    .from('teacher_centers')
    .select('center_id')
    .eq('trainee_id', traineeId)
    .single();

  // Program tracks
  const { data: tps } = await supabase
    .from('teacher_programs')
    .select('program_id')
    .eq('trainee_id', traineeId);

  // Role + admin scope: prefer profile (live) over trainee (pre-assigned)
  let role: UserScopeResponse['role'] = (trainee.pre_assigned_role as UserScopeResponse['role']) ?? 'user';
  let adminScopeCenterIds: string[] = trainee.pre_assigned_admin_scope_center_ids ?? [];
  let adminScopeTrackIds: string[] = trainee.pre_assigned_admin_scope_track_ids ?? [];

  if (trainee.user_id) {
    let profile: {
      role: string;
      admin_scope_center_id?: string | null;
      admin_scope_center_ids?: string[] | null;
      admin_scope_track_ids?: string[] | null;
    } | null = null;
    const fullProfile = await supabase
      .from('profiles')
      .select('role, admin_scope_center_id, admin_scope_center_ids, admin_scope_track_ids')
      .eq('id', trainee.user_id)
      .single();
    if (fullProfile.data) {
      profile = fullProfile.data;
    } else if (isMissingColumnError(fullProfile.error, 'admin_scope_center_ids')) {
      const fallback = await supabase
        .from('profiles')
        .select('role, admin_scope_center_id, admin_scope_track_ids')
        .eq('id', trainee.user_id)
        .single();
      profile = fallback.data;
    }
    if (profile) {
      role = profile.role as UserScopeResponse['role'];
      adminScopeCenterIds =
        profile.admin_scope_center_ids && profile.admin_scope_center_ids.length > 0
          ? profile.admin_scope_center_ids
          : profile.admin_scope_center_id
            ? [profile.admin_scope_center_id]
            : [];
      adminScopeTrackIds = profile.admin_scope_track_ids ?? [];
    }
  }
  if (adminScopeCenterIds.length === 0 && tc?.center_id) {
    adminScopeCenterIds = [tc.center_id];
  }

  const payload: UserScopeResponse = {
    trainee: {
      id: trainee.id,
      name: trainee.name,
      email: trainee.email ?? '',
      userId: trainee.user_id ?? null,
    },
    centerId: tc?.center_id ?? null,
    centerIds: role === 'admin' ? adminScopeCenterIds : (tc?.center_id ? [tc.center_id] : []),
    programTrackIds: (tps ?? []).map(r => r.program_id),
    role,
    adminScopeCenterIds,
    adminScopeTrackIds,
  };

  return NextResponse.json(payload);
}

/**
 * PUT /api/admin/users/[traineeId]/scope
 * Body: { centerId, programTrackIds, role?, adminScopeTrackIds? }
 *
 * Replaces the user's center + program tracks. Optionally updates role and
 * admin scope. Writes to the live profile when the user has signed in;
 * otherwise stages on the trainee row.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ traineeId: string }> }
) {
  const { error: authError } = await requireSuperAdmin(request);
  if (authError) return authError;

  const { traineeId } = await params;
  const supabase = createAdminClient();

  let body: {
    centerId?: string | null;
    centerIds?: string[];
    programTrackIds?: string[];
    role?: string;
    adminScopeCenterIds?: string[];
    adminScopeTrackIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    centerId = null,
    centerIds,
    programTrackIds = [],
    role,
    adminScopeCenterIds,
    adminScopeTrackIds = [],
  } = body;

  if (role !== undefined && !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data: trainee } = await supabase
    .from('trainees')
    .select('id, user_id')
    .eq('id', traineeId)
    .single();

  if (!trainee) {
    return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
  }

  // Sanitise admin scope to overlap with selected tracks
  const chosenCenterIds = Array.isArray(centerIds) ? centerIds : centerId ? [centerId] : [];
  const primaryCenterId = chosenCenterIds[0] ?? null;
  const cleanAdminCenters = role === 'admin'
    ? (Array.isArray(adminScopeCenterIds) && adminScopeCenterIds.length > 0 ? adminScopeCenterIds : chosenCenterIds)
    : [];
  const cleanAdminScope = role === 'admin'
    ? adminScopeTrackIds.filter(id => programTrackIds.includes(id))
    : [];

  // 1. Replace teacher center mapping. Teachers have one home center; admins
  // can have many admin-scope centers, stored on profiles/trainees below.
  await supabase.from('teacher_centers').delete().eq('trainee_id', traineeId);
  if (primaryCenterId) {
    const { error } = await supabase
      .from('teacher_centers')
      .insert({ trainee_id: traineeId, center_id: primaryCenterId });
    if (error) {
      console.error('teacher_centers insert error', error);
      return NextResponse.json({ error: 'Failed to set center' }, { status: 500 });
    }
  }

  // 2. Replace program track memberships (delete-all-then-insert, atomic enough
  //    for an admin form save — no concurrent writes expected on the same user)
  await supabase.from('teacher_programs').delete().eq('trainee_id', traineeId);
  if (programTrackIds.length > 0) {
    const rows = programTrackIds.map(track_id => ({
      trainee_id: traineeId,
      program_id: track_id,
    }));
    const { error } = await supabase.from('teacher_programs').insert(rows);
    if (error) {
      console.error('teacher_programs insert error', error);
      return NextResponse.json({ error: 'Failed to set programs' }, { status: 500 });
    }
  }

  // 3. Role + admin scope: live profile vs pre-assigned trainee
  if (role !== undefined) {
    if (trainee.user_id) {
      // Active user — write to profile
      const { error } = await supabase
        .from('profiles')
        .update({
          role,
          admin_scope_center_id: role === 'admin' ? cleanAdminCenters[0] ?? null : null,
          admin_scope_center_ids: cleanAdminCenters,
          admin_scope_track_ids: cleanAdminScope,
        })
        .eq('id', trainee.user_id);
      if (isMissingColumnError(error, 'admin_scope_center_ids')) {
        const retry = await supabase
          .from('profiles')
          .update({
            role,
            admin_scope_center_id: role === 'admin' ? cleanAdminCenters[0] ?? null : null,
            admin_scope_track_ids: cleanAdminScope,
          })
          .eq('id', trainee.user_id);
        if (retry.error) {
          console.error('profiles update error', retry.error);
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }
      } else
      if (error) {
        console.error('profiles update error', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }
    } else {
      // Pending user — stage on trainee
      const { error } = await supabase
        .from('trainees')
        .update({
          pre_assigned_role: role,
          pre_assigned_admin_scope_center_ids: cleanAdminCenters,
          pre_assigned_admin_scope_track_ids: cleanAdminScope,
        })
        .eq('id', traineeId);
      if (isMissingColumnError(error, 'pre_assigned_admin_scope_center_ids')) {
        const retry = await supabase
          .from('trainees')
          .update({
            pre_assigned_role: role,
            pre_assigned_admin_scope_track_ids: cleanAdminScope,
          })
          .eq('id', traineeId);
        if (retry.error) {
          console.error('trainees pre-assign update error', retry.error);
          return NextResponse.json({ error: 'Failed to stage role' }, { status: 500 });
        }
      } else
      if (error) {
        console.error('trainees pre-assign update error', error);
        return NextResponse.json({ error: 'Failed to stage role' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
