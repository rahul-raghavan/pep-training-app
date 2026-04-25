import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { adminScopeError } from '@/lib/admin-scope';

interface RosterTeacher {
  id: string;
  name: string;
  email: string;
  centerName: string | null;
  trackNames: string[];
  enrolled: boolean;
  progressPct: number;
  lastActiveAt: string | null;
}

interface RosterPayload {
  course: { id: string; slug: string; title: string };
  trackNames: string[];
  teachers: RosterTeacher[];
  /** True when no tracks are mapped — UI should nudge to set tracks first. */
  needsTracks: boolean;
}

/**
 * GET /api/admin/programs/[programId]/roster
 *
 * Lists every teacher who is in *any* of the program tracks this course is
 * mapped to (via course_programs → teacher_programs), with their current
 * enrollment status, progress, and last-active.
 *
 * Excludes test accounts. Respects regular-admin scope (center + tracks).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from('programs')
    .select('id, slug, title')
    .eq('id', programId)
    .single();

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Tracks this course is mapped to
  const { data: cps } = await supabase
    .from('course_programs')
    .select('track_id')
    .eq('program_id', programId);
  const trackIds = (cps ?? []).map(r => r.track_id);

  if (trackIds.length === 0) {
    return NextResponse.json<RosterPayload>({
      course,
      trackNames: [],
      teachers: [],
      needsTracks: true,
    });
  }
  if (user.role === 'admin' && (!user.adminScopeCenterId || user.adminScopeTrackIds.length === 0)) {
    return adminScopeError();
  }

  // Restrict to admin's tracks
  const allowedTrackIds =
    user.role === 'admin'
      ? trackIds.filter(id => user.adminScopeTrackIds.includes(id))
      : trackIds;
  if (user.role === 'admin' && allowedTrackIds.length === 0) {
    return NextResponse.json(
      { error: 'This course is not in any of your managed program tracks' },
      { status: 403 }
    );
  }

  const { data: tracks } = await supabase
    .from('program_tracks')
    .select('id, name')
    .in('id', allowedTrackIds);
  const trackNames = (tracks ?? []).map(t => t.name);
  const trackNameById = new Map((tracks ?? []).map(t => [t.id, t.name]));

  // Trainees in any of those tracks
  const { data: tps } = await supabase
    .from('teacher_programs')
    .select('trainee_id, program_id')
    .in('program_id', allowedTrackIds);

  const trackIdsByTrainee = new Map<string, string[]>();
  for (const r of tps ?? []) {
    const arr = trackIdsByTrainee.get(r.trainee_id) ?? [];
    arr.push(r.program_id);
    trackIdsByTrainee.set(r.trainee_id, arr);
  }

  const allTraineeIds = [...trackIdsByTrainee.keys()];
  if (allTraineeIds.length === 0) {
    return NextResponse.json<RosterPayload>({
      course,
      trackNames,
      teachers: [],
      needsTracks: false,
    });
  }

  // Trainee details — exclude test accounts; restrict admin to their center.
  let trainees: { id: string; name: string; email: string | null; last_active_at: string | null }[] = [];
  {
    const full = await supabase
      .from('trainees')
      .select('id, name, email, last_active_at')
      .in('id', allTraineeIds)
      .eq('is_test_account', false);
    if (full.error?.code === '42703') {
      const fallback = await supabase
        .from('trainees')
        .select('id, name, email, last_active_at')
        .in('id', allTraineeIds);
      trainees = fallback.data ?? [];
    } else {
      trainees = full.data ?? [];
    }
  }

  // Center mapping
  const { data: tcs } = await supabase
    .from('teacher_centers')
    .select('trainee_id, center_id, centers(id, name)')
    .in('trainee_id', trainees.map(t => t.id));
  const centerByTrainee = new Map<string, { centerId: string; centerName: string }>();
  for (const r of tcs ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (r as any).centers as { id: string; name: string } | null;
    if (c) {
      centerByTrainee.set(r.trainee_id, { centerId: c.id, centerName: c.name });
    }
  }

  // Restrict regular admin to their center
  if (user.role === 'admin' && user.adminScopeCenterId) {
    trainees = trainees.filter(
      t => centerByTrainee.get(t.id)?.centerId === user.adminScopeCenterId
    );
  }

  if (trainees.length === 0) {
    return NextResponse.json<RosterPayload>({
      course,
      trackNames,
      teachers: [],
      needsTracks: false,
    });
  }

  const traineeIds = trainees.map(t => t.id);

  // Existing enrollment for THIS course
  const { data: enrolls } = await supabase
    .from('trainee_programs')
    .select('trainee_id')
    .eq('program_id', programId)
    .in('trainee_id', traineeIds);
  const enrolledSet = new Set((enrolls ?? []).map(e => e.trainee_id));

  // Per-trainee progress on this course
  const { data: courseSections } = await supabase
    .from('program_sections')
    .select('id')
    .eq('program_id', programId);
  const sectionIds = (courseSections ?? []).map(s => s.id);
  const totalSections = sectionIds.length;

  let completedByTrainee = new Map<string, number>();
  if (sectionIds.length > 0 && traineeIds.length > 0) {
    const { data: progress } = await supabase
      .from('progress')
      .select('trainee_id, section_id, status')
      .in('trainee_id', traineeIds)
      .in('section_id', sectionIds)
      .eq('status', 'completed');
    completedByTrainee = new Map<string, number>();
    for (const p of progress ?? []) {
      completedByTrainee.set(p.trainee_id, (completedByTrainee.get(p.trainee_id) ?? 0) + 1);
    }
  }

  const teachers: RosterTeacher[] = trainees
    .map(t => {
      const trackIdsForT = trackIdsByTrainee.get(t.id) ?? [];
      const teacherTracks = trackIdsForT
        .map(id => trackNameById.get(id))
        .filter((n): n is string => Boolean(n));
      const completed = completedByTrainee.get(t.id) ?? 0;
      return {
        id: t.id,
        name: t.name,
        email: t.email ?? '',
        centerName: centerByTrainee.get(t.id)?.centerName ?? null,
        trackNames: teacherTracks,
        enrolled: enrolledSet.has(t.id),
        progressPct: totalSections > 0 ? Math.round((completed / totalSections) * 100) : 0,
        lastActiveAt: t.last_active_at,
      };
    })
    .sort((a, b) => {
      // Enrolled first, then by name
      if (a.enrolled !== b.enrolled) return a.enrolled ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json<RosterPayload>({
    course,
    trackNames,
    teachers,
    needsTracks: false,
  });
}

/**
 * PUT /api/admin/programs/[programId]/roster
 * Body: { add?: string[]; remove?: string[] }
 *
 * Bulk enroll/unenroll trainees in this course. Reuses the same scope checks
 * we already enforce on the per-cell PUT (trainee in admin's center+tracks,
 * course in admin's tracks). Idempotent on add via upsert.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  const supabase = createAdminClient();

  let body: { add?: string[]; remove?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const addIds = Array.isArray(body.add) ? body.add : [];
  const removeIds = Array.isArray(body.remove) ? body.remove : [];

  if (addIds.length === 0 && removeIds.length === 0) {
    return NextResponse.json({ ok: true, added: 0, removed: 0 });
  }

  // Course tracks (for scope check)
  const { data: cps } = await supabase
    .from('course_programs')
    .select('track_id')
    .eq('program_id', programId);
  const courseTrackIds = (cps ?? []).map(r => r.track_id);
  if (courseTrackIds.length === 0) {
    return NextResponse.json(
      { error: 'Course is not mapped to any track. Map it on the Settings tab first.' },
      { status: 400 }
    );
  }

  // For regular admins, the course's tracks must overlap with their managed tracks
  if (user.role === 'admin') {
    if (!user.adminScopeCenterId || user.adminScopeTrackIds.length === 0) {
      return adminScopeError();
    }
    const overlap = courseTrackIds.filter(id => user.adminScopeTrackIds.includes(id));
    if (overlap.length === 0) {
      return NextResponse.json(
        { error: 'This course is not in any of your managed program tracks' },
        { status: 403 }
      );
    }
  }

  const allTouched = [...new Set([...addIds, ...removeIds])];

  // Validate trainees are in the relevant tracks (and admin's center, for regular admins)
  const { data: tps } = await supabase
    .from('teacher_programs')
    .select('trainee_id, program_id')
    .in('trainee_id', allTouched);
  const trackIdsByTrainee = new Map<string, Set<string>>();
  for (const r of tps ?? []) {
    const set = trackIdsByTrainee.get(r.trainee_id) ?? new Set<string>();
    set.add(r.program_id);
    trackIdsByTrainee.set(r.trainee_id, set);
  }

  const validTraineeIds = allTouched.filter(id => {
    const tracks = trackIdsByTrainee.get(id);
    if (!tracks) return false;
    return courseTrackIds.some(t => tracks.has(t));
  });

  let validIds = validTraineeIds;
  if (user.role === 'admin' && user.adminScopeCenterId) {
    const { data: tcs } = await supabase
      .from('teacher_centers')
      .select('trainee_id, center_id')
      .in('trainee_id', validIds)
      .eq('center_id', user.adminScopeCenterId);
    const inCenter = new Set((tcs ?? []).map(r => r.trainee_id));
    validIds = validIds.filter(id => inCenter.has(id));
  }

  const validSet = new Set(validIds);
  const safeAdd = addIds.filter(id => validSet.has(id));
  const safeRemove = removeIds.filter(id => validSet.has(id));

  if (safeAdd.length > 0) {
    const rows = safeAdd.map(trainee_id => ({ trainee_id, program_id: programId }));
    const { error } = await supabase
      .from('trainee_programs')
      .upsert(rows, { onConflict: 'trainee_id,program_id', ignoreDuplicates: true });
    if (error) {
      console.error('roster add error', error);
      return NextResponse.json({ error: 'Failed to enrol some teachers' }, { status: 500 });
    }
  }

  if (safeRemove.length > 0) {
    const { error } = await supabase
      .from('trainee_programs')
      .delete()
      .eq('program_id', programId)
      .in('trainee_id', safeRemove);
    if (error) {
      console.error('roster remove error', error);
      return NextResponse.json({ error: 'Failed to unenroll some teachers' }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    added: safeAdd.length,
    removed: safeRemove.length,
    skipped: addIds.length + removeIds.length - safeAdd.length - safeRemove.length,
  });
}
