import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

interface DashboardPayload {
  scope: {
    role: 'super_admin' | 'admin' | 'user';
    centerName: string | null;
    centerId: string | null;
    centers: { id: string; slug: string; name: string }[];
    trackNames: string[];
    scopeLocked: boolean;
    /** True when the response aggregates across every center (super_admin default). */
    isAllCenters: boolean;
  };
  attention: {
    stalledCount: number;
    belowThresholdCount: number;
    unmappedCoursesCount: number;
    pendingScopeUsersCount: number;
  };
  stats: {
    teachers: number;
    courses: number;
    avgProgress: number | null;
    voiceAttempts: number;
  };
  migrationApplied: boolean;
}

const STALLED_DAYS = 14;
const LOW_SCORE_THRESHOLD = 3;

/**
 * GET /api/admin/dashboard?centerId=...
 * Action-driven roll-up for the admin landing page.
 *
 * Scope:
 *   • super_admin omitting centerId (or sending ?centerId=all) → aggregate across every center
 *   • super_admin with a specific centerId → that one
 *   • admin → always pinned to their center + tracks
 */
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const requestedCenterIdRaw = request.nextUrl.searchParams.get('centerId');
  const requestedCenterId =
    requestedCenterIdRaw && requestedCenterIdRaw !== 'all' ? requestedCenterIdRaw : null;

  // Centers
  let centers: { id: string; slug: string; name: string }[] = [];
  let migrationApplied = true;
  {
    const { data, error } = await supabase
      .from('centers')
      .select('id, slug, name')
      .eq('is_active', true)
      .order('name');
    if (error?.code === '42P01') migrationApplied = false;
    else centers = data ?? [];
  }

  if (!migrationApplied) {
    return NextResponse.json<DashboardPayload>({
      scope: {
        role: user.role,
        centerName: null,
        centerId: null,
        centers: [],
        trackNames: [],
        scopeLocked: false,
        isAllCenters: false,
      },
      attention: {
        stalledCount: 0,
        belowThresholdCount: 0,
        unmappedCoursesCount: 0,
        pendingScopeUsersCount: 0,
      },
      stats: { teachers: 0, courses: 0, avgProgress: null, voiceAttempts: 0 },
      migrationApplied: false,
    });
  }

  // Resolve scope.
  //   super_admin: requestedCenterId or "all" (default)
  //   admin: pinned to their adminScopeCenterId
  let centerId: string | null;
  let scopeLocked = false;
  let isAllCenters = false;
  if (user.role === 'super_admin') {
    if (requestedCenterId) {
      centerId = requestedCenterId;
    } else {
      centerId = null;
      isAllCenters = true;
    }
  } else {
    centerId = user.adminScopeCenterId ?? null;
    scopeLocked = true;
  }
  const center = centerId ? centers.find(c => c.id === centerId) ?? null : null;

  // Track names for the greeting
  let trackNames: string[] = [];
  if (user.role === 'admin' && user.adminScopeTrackIds.length > 0) {
    const { data: tracks } = await supabase
      .from('program_tracks')
      .select('name')
      .in('id', user.adminScopeTrackIds);
    trackNames = (tracks ?? []).map(t => t.name);
  }

  // Regular admin without scope yet: bail with empty stats.
  if (!isAllCenters && !centerId) {
    return NextResponse.json<DashboardPayload>({
      scope: {
        role: user.role,
        centerName: center?.name ?? null,
        centerId: null,
        centers,
        trackNames,
        scopeLocked,
        isAllCenters: false,
      },
      attention: {
        stalledCount: 0,
        belowThresholdCount: 0,
        unmappedCoursesCount: 0,
        pendingScopeUsersCount: 0,
      },
      stats: { teachers: 0, courses: 0, avgProgress: null, voiceAttempts: 0 },
      migrationApplied,
    });
  }
  if (user.role === 'admin' && user.adminScopeTrackIds.length === 0) {
    return NextResponse.json<DashboardPayload>({
      scope: {
        role: user.role,
        centerName: center?.name ?? null,
        centerId,
        centers,
        trackNames,
        scopeLocked,
        isAllCenters: false,
      },
      attention: {
        stalledCount: 0,
        belowThresholdCount: 0,
        unmappedCoursesCount: 0,
        pendingScopeUsersCount: 0,
      },
      stats: { teachers: 0, courses: 0, avgProgress: null, voiceAttempts: 0 },
      migrationApplied,
    });
  }

  // Trainees in scope (excluding test accounts).
  // - All-centers mode: all teacher_centers rows
  // - Specific center: rows for that center only
  let tcQuery = supabase.from('teacher_centers').select('trainee_id');
  if (!isAllCenters && centerId) {
    tcQuery = tcQuery.eq('center_id', centerId);
  }
  const { data: tcRows } = await tcQuery;
  const traineeIdsAll = (tcRows ?? []).map(r => r.trainee_id);

  let trainees: { id: string; last_active_at: string | null }[] = [];
  if (traineeIdsAll.length) {
    const full = await supabase
      .from('trainees')
      .select('id, last_active_at')
      .in('id', traineeIdsAll)
      .eq('is_test_account', false);
    if (full.error?.code === '42703') {
      const fallback = await supabase
        .from('trainees')
        .select('id, last_active_at')
        .in('id', traineeIdsAll);
      trainees = fallback.data ?? [];
    } else {
      trainees = full.data ?? [];
    }
  }

  // Restrict to admin's tracks
  if (user.role === 'admin' && trainees.length) {
    const { data: tps } = await supabase
      .from('teacher_programs')
      .select('trainee_id')
      .in('trainee_id', trainees.map(t => t.id))
      .in('program_id', user.adminScopeTrackIds);
    const inScope = new Set((tps ?? []).map(r => r.trainee_id));
    trainees = trainees.filter(t => inScope.has(t.id));
  }

  const traineeIds = trainees.map(t => t.id);

  // Courses in scope (mapped to relevant tracks)
  const trackIdsInScope =
    user.role === 'admin'
      ? user.adminScopeTrackIds
      : null;

  let coursesInScope: { id: string; title: string }[] = [];
  if (trackIdsInScope) {
    const { data: cps } = await supabase
      .from('course_programs')
      .select('program_id, programs(id, title)')
      .in('track_id', trackIdsInScope);
    const seen = new Set<string>();
    for (const r of cps ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (r as any).programs as { id: string; title: string } | null;
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        coursesInScope.push(p);
      }
    }
  } else {
    // super_admin without filter — count active courses globally
    const { data: progs } = await supabase
      .from('programs')
      .select('id, title')
      .eq('is_active', true);
    coursesInScope = progs ?? [];
  }

  // Enrollments + progress for these trainees
  const { data: enrollments } = traineeIds.length
    ? await supabase
        .from('trainee_programs')
        .select('trainee_id, program_id')
        .in('trainee_id', traineeIds)
    : { data: [] as { trainee_id: string; program_id: string }[] };

  const enrollmentsByTrainee = new Map<string, Set<string>>();
  for (const e of enrollments ?? []) {
    const set = enrollmentsByTrainee.get(e.trainee_id) ?? new Set<string>();
    set.add(e.program_id);
    enrollmentsByTrainee.set(e.trainee_id, set);
  }

  // Section totals per course (for progress %)
  const allEnrolledCourseIds = new Set<string>();
  for (const set of enrollmentsByTrainee.values()) {
    for (const id of set) allEnrolledCourseIds.add(id);
  }
  const { data: sections } = allEnrolledCourseIds.size
    ? await supabase
        .from('program_sections')
        .select('id, program_id')
        .in('program_id', [...allEnrolledCourseIds])
    : { data: [] as { id: string; program_id: string }[] };
  const sectionToCourse = new Map<string, string>();
  const courseSectionCount = new Map<string, number>();
  for (const s of sections ?? []) {
    sectionToCourse.set(s.id, s.program_id);
    courseSectionCount.set(s.program_id, (courseSectionCount.get(s.program_id) ?? 0) + 1);
  }

  // Completed-progress rows for our trainees
  const { data: progressRows } = traineeIds.length
    ? await supabase
        .from('progress')
        .select('trainee_id, section_id, status')
        .in('trainee_id', traineeIds)
        .eq('status', 'completed')
    : { data: [] as { trainee_id: string; section_id: string; status: string }[] };

  const completedByTraineeCourse = new Map<string, number>(); // key: trainee::course
  for (const p of progressRows ?? []) {
    const cid = sectionToCourse.get(p.section_id);
    if (!cid) continue;
    const key = `${p.trainee_id}::${cid}`;
    completedByTraineeCourse.set(key, (completedByTraineeCourse.get(key) ?? 0) + 1);
  }

  // Voice scores in last 30d (for "below threshold")
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentVoice } = traineeIds.length
    ? await supabase
        .from('responses')
        .select('trainee_id, ai_score, created_at')
        .in('trainee_id', traineeIds)
        .eq('exercise_type', 'voice')
        .not('ai_score', 'is', null)
        .gte('created_at', since)
    : { data: [] as { trainee_id: string; ai_score: number; created_at: string }[] };
  const voiceByTrainee = new Map<string, number[]>();
  for (const r of recentVoice ?? []) {
    if (typeof r.ai_score !== 'number') continue;
    const arr = voiceByTrainee.get(r.trainee_id) ?? [];
    arr.push(r.ai_score);
    voiceByTrainee.set(r.trainee_id, arr);
  }

  // Compute attention metrics
  let stalledCount = 0;
  let belowThresholdCount = 0;
  let totalProgressNum = 0;
  let totalProgressDen = 0;

  for (const t of trainees) {
    const enrolled = enrollmentsByTrainee.get(t.id);
    if (!enrolled || enrolled.size === 0) continue;

    let completedAcross = 0;
    let totalAcross = 0;
    for (const cid of enrolled) {
      completedAcross += completedByTraineeCourse.get(`${t.id}::${cid}`) ?? 0;
      totalAcross += courseSectionCount.get(cid) ?? 0;
    }
    const overallPct = totalAcross > 0 ? completedAcross / totalAcross : 0;

    if (totalAcross > 0) {
      totalProgressNum += completedAcross;
      totalProgressDen += totalAcross;
    }

    const inactiveDays = t.last_active_at
      ? (Date.now() - new Date(t.last_active_at).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (overallPct === 0 && (inactiveDays === Infinity || inactiveDays >= STALLED_DAYS)) {
      stalledCount += 1;
    }

    const recent = voiceByTrainee.get(t.id);
    if (recent && recent.length >= 2) {
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (avg < LOW_SCORE_THRESHOLD) belowThresholdCount += 1;
    }
  }

  // Unmapped courses — courses (programs) with no course_programs row.
  // Bound the search to courses that have at least one section so we don't
  // surface empty draft programs.
  let unmappedCoursesCount = 0;
  {
    const { data: allActiveCourses } = await supabase
      .from('programs')
      .select('id')
      .eq('is_active', true);
    const ids = (allActiveCourses ?? []).map(p => p.id);
    if (ids.length) {
      const { data: mapped } = await supabase
        .from('course_programs')
        .select('program_id')
        .in('program_id', ids);
      const mappedSet = new Set((mapped ?? []).map(m => m.program_id));
      // Also confirm the course actually has sections (otherwise it's a draft).
      const { data: hasSections } = await supabase
        .from('program_sections')
        .select('program_id')
        .in('program_id', ids);
      const withSections = new Set((hasSections ?? []).map(s => s.program_id));
      unmappedCoursesCount = ids.filter(id => !mappedSet.has(id) && withSections.has(id)).length;
    }
  }

  // Pending-scope users — trainees in this center missing a track membership
  let pendingScopeUsersCount = 0;
  if (traineeIds.length) {
    const { data: tpRows } = await supabase
      .from('teacher_programs')
      .select('trainee_id')
      .in('trainee_id', traineeIds);
    const withTrack = new Set((tpRows ?? []).map(r => r.trainee_id));
    pendingScopeUsersCount = traineeIds.filter(id => !withTrack.has(id)).length;
  }

  return NextResponse.json<DashboardPayload>({
    scope: {
      role: user.role,
      centerName: center?.name ?? null,
      centerId,
      centers,
      trackNames,
      scopeLocked,
      isAllCenters,
    },
    attention: {
      stalledCount,
      belowThresholdCount,
      unmappedCoursesCount,
      pendingScopeUsersCount,
    },
    stats: {
      teachers: trainees.length,
      courses: coursesInScope.length,
      avgProgress: totalProgressDen > 0 ? Math.round((totalProgressNum / totalProgressDen) * 100) : null,
      voiceAttempts: (recentVoice ?? []).length,
    },
    migrationApplied,
  });
}
