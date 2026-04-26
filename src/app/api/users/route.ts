import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';
import { getScopedTraineeIds } from '@/lib/admin-scope';
import { sortCourses, sortProgramTracks } from '@/lib/course-order';

interface TraineeLite {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  is_test_account?: boolean | null;
}

interface CenterLite {
  id: string;
  slug: string;
  name: string;
}

interface ProgramTrackLite {
  id: string;
  slug: string;
  name: string;
}

interface EnrollmentLite {
  program_id: string;
  title: string;
  slug: string;
}

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
  let trainees: TraineeLite[] = [];
  const traineeQuery = await supabase
    .from('trainees')
    .select('id, user_id, name, email, is_test_account')
    .in('user_id', userIds);
  if (traineeQuery.error?.code === '42703') {
    const fallback = await supabase
      .from('trainees')
      .select('id, user_id, name, email')
      .in('user_id', userIds);
    trainees = (fallback.data ?? []) as TraineeLite[];
  } else {
    trainees = (traineeQuery.data ?? []) as TraineeLite[];
  }

  const traineeMap: Record<string, TraineeLite> = {};
  trainees
    .filter(t => !scopedTraineeIds || scopedTraineeIds.has(t.id))
    .forEach(t => {
      if (t.user_id) traineeMap[t.user_id] = t;
    });

  // Get enrollment counts
  const traineeIds = trainees
    .map(t => t.id)
    .filter(id => !scopedTraineeIds || scopedTraineeIds.has(id));
  const { data: enrollments } = traineeIds.length > 0
    ? await supabase
        .from('trainee_programs')
        .select('trainee_id, program_id, programs(title, slug)')
        .in('trainee_id', traineeIds)
    : { data: [] };

  const enrollmentMap: Record<string, EnrollmentLite[]> = {};
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

  // Also fetch pre-registered trainees (no user_id = haven't logged in yet)
  let pendingTraineesRaw: (TraineeLite & { pre_assigned_role: string | null; created_at: string })[] = [];
  const pendingQuery = await supabase
    .from('trainees')
    .select('id, user_id, name, email, is_test_account, pre_assigned_role, created_at')
    .is('user_id', null)
    .order('created_at', { ascending: false });
  if (pendingQuery.error?.code === '42703') {
    const fallback = await supabase
      .from('trainees')
      .select('id, user_id, name, email, pre_assigned_role, created_at')
      .is('user_id', null)
      .order('created_at', { ascending: false });
    pendingTraineesRaw = (fallback.data ?? []) as typeof pendingTraineesRaw;
  } else {
    pendingTraineesRaw = (pendingQuery.data ?? []) as typeof pendingTraineesRaw;
  }
  const pendingTrainees = (pendingTraineesRaw || []).filter(
    t => !scopedTraineeIds || scopedTraineeIds.has(t.id)
  );

  // Get enrollments for pending trainees too
  const pendingTraineeIds = (pendingTrainees || []).map((t: { id: string }) => t.id);
  const { data: pendingEnrollments } = pendingTraineeIds.length > 0
    ? await supabase
        .from('trainee_programs')
        .select('trainee_id, program_id, programs(title, slug)')
        .in('trainee_id', pendingTraineeIds)
    : { data: [] };

  const pendingEnrollmentMap: Record<string, EnrollmentLite[]> = {};
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

  const allVisibleTraineeIds = [...new Set([...traineeIds, ...pendingTraineeIds])];
  const centerMap: Record<string, CenterLite | null> = {};
  const trackMap: Record<string, ProgramTrackLite[]> = {};
  if (allVisibleTraineeIds.length > 0) {
    const [{ data: centerRows, error: centerError }, { data: trackRows, error: trackError }] = await Promise.all([
      supabase
        .from('teacher_centers')
        .select('trainee_id, centers(id, slug, name)')
        .in('trainee_id', allVisibleTraineeIds),
      supabase
        .from('teacher_programs')
        .select('trainee_id, program_tracks(id, slug, name)')
        .in('trainee_id', allVisibleTraineeIds),
    ]);

    if (!centerError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (centerRows ?? []).forEach((row: any) => {
        centerMap[row.trainee_id] = Array.isArray(row.centers) ? row.centers[0] ?? null : row.centers ?? null;
      });
    }

    if (!trackError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (trackRows ?? []).forEach((row: any) => {
        const track = Array.isArray(row.program_tracks) ? row.program_tracks[0] : row.program_tracks;
        if (!track) return;
        const arr = trackMap[row.trainee_id] ?? [];
        arr.push(track);
        trackMap[row.trainee_id] = arr;
      });
      Object.keys(trackMap).forEach(traineeId => {
        trackMap[traineeId] = sortProgramTracks(trackMap[traineeId]);
      });
    }
  }

  Object.keys(enrollmentMap).forEach(traineeId => {
    enrollmentMap[traineeId] = sortCourses(enrollmentMap[traineeId]);
  });
  Object.keys(pendingEnrollmentMap).forEach(traineeId => {
    pendingEnrollmentMap[traineeId] = sortCourses(pendingEnrollmentMap[traineeId]);
  });

  const users = profiles
    ?.filter(profile => user.role === 'super_admin' || Boolean(traineeMap[profile.id]))
    .map(profile => {
      const trainee = traineeMap[profile.id];
      return {
        ...profile,
        traineeId: trainee?.id || null,
        isTestAccount: Boolean(trainee?.is_test_account),
        center: trainee ? centerMap[trainee.id] ?? null : null,
        programTracks: trainee ? trackMap[trainee.id] ?? [] : [],
        enrollments: trainee ? enrollmentMap[trainee.id] || [] : [],
        pending: false,
      };
    });

  const pendingUsers = (pendingTrainees || []).map(t => ({
    id: `pending_${t.id}`,
    traineeId: t.id,
    email: t.email,
    name: t.name,
    role: t.pre_assigned_role || 'user',
    is_active: true,
    created_at: t.created_at,
    isTestAccount: Boolean(t.is_test_account),
    center: centerMap[t.id] ?? null,
    programTracks: trackMap[t.id] ?? [],
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
      centerIds,
      programTrackIds,
      adminScopeCenterIds,
      adminScopeTrackIds,
    }: {
      email?: string;
      name?: string;
      role?: string;
      centerId?: string | null;
      centerIds?: string[];
      programTrackIds?: string[];
      adminScopeCenterIds?: string[];
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
    const cleanCenters = Array.isArray(centerIds) ? centerIds : centerId ? [centerId] : [];
    const cleanProgramTracks = Array.isArray(programTrackIds) ? programTrackIds : [];
    const cleanAdminCenters =
      role === 'admin'
        ? Array.isArray(adminScopeCenterIds) && adminScopeCenterIds.length > 0
          ? adminScopeCenterIds
          : cleanCenters
        : [];
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
      pre_assigned_admin_scope_center_ids: cleanAdminCenters,
      pre_assigned_admin_scope_track_ids: cleanAdminScope,
    };

    let { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .insert(traineeInsert)
      .select()
      .single();

    if (traineeError && traineeError.code === '42703') {
      const {
        pre_assigned_admin_scope_center_ids: _dropCenters,
        ...fallbackWithTrackScope
      } = traineeInsert as {
        pre_assigned_admin_scope_center_ids: unknown;
        [k: string]: unknown;
      };
      void _dropCenters;
      traineeInsert = fallbackWithTrackScope;
      let retry = await supabase.from('trainees').insert(fallbackWithTrackScope).select().single();
      if (retry.error?.code === '42703') {
        const {
          pre_assigned_admin_scope_track_ids: _dropTracks,
          ...fallbackBasic
        } = fallbackWithTrackScope as {
          pre_assigned_admin_scope_track_ids: unknown;
          [k: string]: unknown;
        };
        void _dropTracks;
        traineeInsert = fallbackBasic;
        retry = await supabase.from('trainees').insert(fallbackBasic).select().single();
      }
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

    if (cleanCenters[0]) {
      const { error } = await supabase
        .from('teacher_centers')
        .insert({ trainee_id: trainee.id, center_id: cleanCenters[0] });
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
