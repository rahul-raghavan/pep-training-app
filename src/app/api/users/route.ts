import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';
import { getScopedTraineeIds } from '@/lib/admin-scope';

// GET - List all users with their profiles
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const scopedTraineeIds = await getScopedTraineeIds(supabase, user);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  // Get linked trainee IDs
  const userIds = profiles?.map(p => p.id) || [];
  const { data: trainees } = await supabase
    .from('trainees')
    .select('id, user_id, name, email')
    .in('user_id', userIds);

  const traineeMap: Record<string, string> = {};
  (trainees || [])
    .filter((t: { id: string }) => !scopedTraineeIds || scopedTraineeIds.has(t.id))
    .forEach((t: { id: string; user_id: string }) => {
      if (t.user_id) traineeMap[t.user_id] = t.id;
    });

  // Get enrollment counts
  const traineeIds = (trainees || [])
    .map((t: { id: string }) => t.id)
    .filter((id: string) => !scopedTraineeIds || scopedTraineeIds.has(id));
  const { data: enrollments } = traineeIds.length > 0
    ? await supabase
        .from('trainee_programs')
        .select('trainee_id, program_id, programs(title, slug)')
        .in('trainee_id', traineeIds)
    : { data: [] };

  const enrollmentMap: Record<string, { program_id: string; title: string; slug: string }[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (enrollments || []).forEach((e: any) => {
    if (!e.programs) return;
    if (!enrollmentMap[e.trainee_id]) enrollmentMap[e.trainee_id] = [];
    enrollmentMap[e.trainee_id].push({
      program_id: e.program_id,
      title: e.programs.title,
      slug: e.programs.slug,
    });
  });

  const users = profiles
    ?.filter(profile => user.role === 'super_admin' || Boolean(traineeMap[profile.id]))
    .map(profile => ({
      ...profile,
      traineeId: traineeMap[profile.id] || null,
      enrollments: enrollmentMap[traineeMap[profile.id]] || [],
      pending: false,
    }));

  // Also fetch pre-registered trainees (no user_id = haven't logged in yet)
  const { data: pendingTraineesRaw } = await supabase
    .from('trainees')
    .select('id, name, email, pre_assigned_role, created_at')
    .is('user_id', null)
    .order('created_at', { ascending: false });
  const pendingTrainees = (pendingTraineesRaw || []).filter(
    (t: { id: string }) => !scopedTraineeIds || scopedTraineeIds.has(t.id)
  );

  // Get enrollments for pending trainees too
  const pendingTraineeIds = (pendingTrainees || []).map((t: { id: string }) => t.id);
  const { data: pendingEnrollments } = pendingTraineeIds.length > 0
    ? await supabase
        .from('trainee_programs')
        .select('trainee_id, program_id, programs(title, slug)')
        .in('trainee_id', pendingTraineeIds)
    : { data: [] };

  const pendingEnrollmentMap: Record<string, { program_id: string; title: string; slug: string }[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pendingEnrollments || []).forEach((e: any) => {
    if (!e.programs) return;
    if (!pendingEnrollmentMap[e.trainee_id]) pendingEnrollmentMap[e.trainee_id] = [];
    pendingEnrollmentMap[e.trainee_id].push({
      program_id: e.program_id,
      title: e.programs.title,
      slug: e.programs.slug,
    });
  });

  const pendingUsers = (pendingTrainees || []).map((t: { id: string; name: string; email: string; pre_assigned_role: string | null; created_at: string }) => ({
    id: `pending_${t.id}`,
    traineeId: t.id,
    email: t.email,
    name: t.name,
    role: t.pre_assigned_role || 'user',
    is_active: true,
    created_at: t.created_at,
    enrollments: pendingEnrollmentMap[t.id] || [],
    pending: true,
  }));

  return NextResponse.json({ users: [...(users || []), ...pendingUsers] });
}

// POST - Pre-register a new user (super_admin only)
//
// Body shape:
//   email, name, role                   — required
//   centerId                            — optional (pre-2026 callers)
//   programTrackIds: string[]           — optional, multi (Primary, Elementary, etc.)
//   adminScopeTrackIds: string[]        — optional, only meaningful when role=admin
//
// Writes:
//   trainees row (with pre_assigned_role + pre_assigned_admin_scope_track_ids)
//   teacher_centers row (if centerId provided + table exists)
//   teacher_programs rows (if trackIds provided + table exists)
//
// All center/program writes are best-effort: if the schema migration hasn't been
// applied yet (tables don't exist), we still create the trainee + role and
// return a soft warning. Callers can re-run after migration to backfill.
export async function POST(request: NextRequest) {
  const { error: authError } = await requireSuperAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      email,
      name,
      role,
      centerId,
      programTrackIds,
      adminScopeTrackIds,
    }: {
      email?: string;
      name?: string;
      role?: string;
      centerId?: string | null;
      programTrackIds?: string[];
      adminScopeTrackIds?: string[];
    } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const validRoles = ['user', 'admin', 'super_admin'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const { data: existingTrainee } = await supabase
      .from('trainees')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingTrainee) {
      return NextResponse.json({ error: 'User already pre-registered' }, { status: 409 });
    }

    // Sanitise scope. Admin scope only matters for role=admin. Trim to what's
    // also in programTrackIds — admin can't be admin of a track they aren't on.
    const cleanProgramTracks = Array.isArray(programTrackIds) ? programTrackIds : [];
    const cleanAdminScope =
      role === 'admin' && Array.isArray(adminScopeTrackIds)
        ? adminScopeTrackIds.filter(id => cleanProgramTracks.includes(id))
        : [];

    // Try to write pre_assigned_admin_scope_track_ids; if column doesn't exist
    // (migration not applied), retry without it.
    let traineeInsert: Record<string, unknown> = {
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      access_token: crypto.randomUUID(),
      pre_assigned_role: role || 'user',
      pre_assigned_admin_scope_track_ids: cleanAdminScope,
    };

    let { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .insert(traineeInsert)
      .select()
      .single();

    if (traineeError && traineeError.code === '42703') {
      // Column doesn't exist → migration not applied. Retry without scope.
      const { pre_assigned_admin_scope_track_ids: _drop, ...fallback } = traineeInsert as {
        pre_assigned_admin_scope_track_ids: unknown;
        [k: string]: unknown;
      };
      void _drop;
      traineeInsert = fallback;
      const retry = await supabase.from('trainees').insert(fallback).select().single();
      trainee = retry.data;
      traineeError = retry.error;
    }

    if (traineeError || !trainee) {
      console.error('Error creating trainee:', traineeError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Best-effort: write center + program track mappings. If tables don't
    // exist yet (migration pending), surface a warning but keep the trainee.
    const warnings: string[] = [];

    if (centerId) {
      const { error } = await supabase
        .from('teacher_centers')
        .insert({ trainee_id: trainee.id, center_id: centerId });
      if (error) {
        if (error.code === '42P01') {
          warnings.push('center mapping skipped (schema migration not yet applied)');
        } else {
          console.error('teacher_centers insert error', error);
          warnings.push('center mapping failed');
        }
      }
    }

    if (cleanProgramTracks.length > 0) {
      const rows = cleanProgramTracks.map(track_id => ({
        trainee_id: trainee.id,
        program_id: track_id,
      }));
      const { error } = await supabase.from('teacher_programs').insert(rows);
      if (error) {
        if (error.code === '42P01') {
          warnings.push('program-track mapping skipped (schema migration not yet applied)');
        } else {
          console.error('teacher_programs insert error', error);
          warnings.push('program-track mapping failed');
        }
      }
    }

    return NextResponse.json({
      message: 'User pre-registered. They will get the assigned role on first Google login.',
      trainee,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
