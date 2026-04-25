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
  programTrackIds: string[];
  role: 'super_admin' | 'admin' | 'user';
  adminScopeTrackIds: string[];
}

const VALID_ROLES = ['user', 'admin', 'super_admin'] as const;

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

  const { data: trainee } = await supabase
    .from('trainees')
    .select('id, name, email, user_id, pre_assigned_role, pre_assigned_admin_scope_track_ids')
    .eq('id', traineeId)
    .single();

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
  let adminScopeTrackIds: string[] = trainee.pre_assigned_admin_scope_track_ids ?? [];

  if (trainee.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, admin_scope_track_ids')
      .eq('id', trainee.user_id)
      .single();
    if (profile) {
      role = profile.role as UserScopeResponse['role'];
      adminScopeTrackIds = profile.admin_scope_track_ids ?? [];
    }
  }

  const payload: UserScopeResponse = {
    trainee: {
      id: trainee.id,
      name: trainee.name,
      email: trainee.email ?? '',
      userId: trainee.user_id ?? null,
    },
    centerId: tc?.center_id ?? null,
    programTrackIds: (tps ?? []).map(r => r.program_id),
    role,
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
    programTrackIds?: string[];
    role?: string;
    adminScopeTrackIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { centerId = null, programTrackIds = [], role, adminScopeTrackIds = [] } = body;

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
  const cleanAdminScope = role === 'admin'
    ? adminScopeTrackIds.filter(id => programTrackIds.includes(id))
    : [];

  // 1. Replace center mapping (delete then insert if centerId provided)
  await supabase.from('teacher_centers').delete().eq('trainee_id', traineeId);
  if (centerId) {
    const { error } = await supabase
      .from('teacher_centers')
      .insert({ trainee_id: traineeId, center_id: centerId });
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
          admin_scope_center_id: role === 'admin' ? centerId : null,
          admin_scope_track_ids: cleanAdminScope,
        })
        .eq('id', trainee.user_id);
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
          pre_assigned_admin_scope_track_ids: cleanAdminScope,
        })
        .eq('id', traineeId);
      if (error) {
        console.error('trainees pre-assign update error', error);
        return NextResponse.json({ error: 'Failed to stage role' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
