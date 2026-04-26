import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { sortCourses, sortProgramTracks } from '@/lib/course-order';

interface TeacherEntry {
  id: string;            // trainee id
  name: string;
  email: string;
  /** Course ids (programs.id) this teacher is currently enrolled in. */
  courseIds: string[];
  /** Per-course progress percentage for assigned courses. */
  coursePct: Record<string, number>;
  /** Overall progress across all assigned courses. 0 if no assignments. */
  overallPct: number;
  /** Last activity (last_active_at on trainees). */
  lastActiveAt: string | null;
  /** Auto-flagged attention category, if any. */
  needsAttention: { kind: 'stalled' | 'stuck' | 'low_score'; reason: string } | null;
}

interface ProgramTrackBlock {
  id: string;
  slug: string;
  name: string;
  teachers: TeacherEntry[];
  courses: { id: string; slug: string; title: string }[];
}

interface CohortResponse {
  center: { id: string; slug: string; name: string } | null;
  centers: { id: string; slug: string; name: string }[];
  programs: ProgramTrackBlock[];
  /** True when the schema migration has been applied. UI uses this for empty hint. */
  migrationApplied: boolean;
  /** True when admin viewing was forced to a particular center by their scope. */
  scopeLocked: boolean;
}

const STALLED_DAYS = 14;
const STUCK_DAYS = 7;
const LOW_SCORE_THRESHOLD = 3;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

/**
 * GET /api/admin/cohort?centerId=...
 *
 * Returns the center → tracks → teachers + courses matrix used by both the
 * admin cohort heatmap and the assignments page. Output includes per-cell
 * progress and auto-flagged "needs attention" reasons.
 *
 * Scoping rules:
 *   • super_admin: can pass any centerId (or omit; uses first available)
 *   • admin:       always forced to admin_scope_center_id; admin_scope_track_ids
 *                  filter the program list shown
 */
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const requestedCenterId = request.nextUrl.searchParams.get('centerId');

  // Load all centers up-front (used for the picker on super_admin views)
  let centers: { id: string; slug: string; name: string }[] = [];
  let migrationApplied = true;
  {
    const { data, error } = await supabase
      .from('centers')
      .select('id, slug, name')
      .eq('is_active', true)
      .order('name');
    if (error?.code === '42P01') {
      migrationApplied = false;
    } else if (error) {
      console.error('cohort: centers query error', error);
    } else {
      centers = data ?? [];
    }
  }

  if (!migrationApplied) {
    return NextResponse.json<CohortResponse>({
      center: null,
      centers: [],
      programs: [],
      migrationApplied: false,
      scopeLocked: false,
    });
  }

  // Resolve which center to show
  let centerId: string | null;
  let scopeLocked = false;
  if (user.role === 'super_admin') {
    centerId = requestedCenterId ?? centers[0]?.id ?? null;
  } else {
    centerId = user.adminScopeCenterId ?? null;
    scopeLocked = true;
  }

  if (!centerId) {
    return NextResponse.json<CohortResponse>({
      center: null,
      centers,
      programs: [],
      migrationApplied,
      scopeLocked,
    });
  }
  const center = centers.find(c => c.id === centerId) ?? null;
  if (user.role === 'admin' && user.adminScopeTrackIds.length === 0) {
    return NextResponse.json<CohortResponse>({
      center,
      centers,
      programs: [],
      migrationApplied,
      scopeLocked,
    });
  }

  // Trainees in this center
  const { data: tcRows } = await supabase
    .from('teacher_centers')
    .select('trainee_id')
    .eq('center_id', centerId);
  const traineeIds = (tcRows ?? []).map(r => r.trainee_id);

  if (traineeIds.length === 0) {
    return NextResponse.json<CohortResponse>({
      center,
      centers,
      programs: [],
      migrationApplied,
      scopeLocked,
    });
  }

  // Trainee details — exclude test accounts so stats stay clean.
  // The is_test_account column may not exist on older DBs; fall back transparently.
  let trainees: { id: string; name: string; email: string | null; last_active_at: string | null }[] = [];
  {
    const full = await supabase
      .from('trainees')
      .select('id, name, email, last_active_at')
      .in('id', traineeIds)
      .eq('is_test_account', false);
    if (full.error?.code === '42703') {
      const fallback = await supabase
        .from('trainees')
        .select('id, name, email, last_active_at')
        .in('id', traineeIds);
      trainees = fallback.data ?? [];
    } else {
      trainees = full.data ?? [];
    }
  }
  const traineeById = new Map(
    trainees.map(t => [
      t.id,
      { id: t.id, name: t.name, email: t.email ?? '', lastActiveAt: t.last_active_at as string | null },
    ])
  );

  // Re-tighten traineeIds to the visible (non-test) ones — downstream queries
  // join on this list, so we don't want to fetch progress for hidden accounts.
  const visibleTraineeIds = new Set(traineeById.keys());

  // Track memberships for visible (non-test) trainees only
  const { data: tpRows } = await supabase
    .from('teacher_programs')
    .select('trainee_id, program_id')
    .in('trainee_id', [...visibleTraineeIds]);

  // For regular admin, restrict tracks to their adminScopeTrackIds
  const allowedTrackIds =
    user.role === 'admin'
      ? new Set(user.adminScopeTrackIds)
      : null;

  const trackToTrainees = new Map<string, string[]>();
  for (const r of tpRows ?? []) {
    if (allowedTrackIds && !allowedTrackIds.has(r.program_id)) continue;
    if (!visibleTraineeIds.has(r.trainee_id)) continue;
    const arr = trackToTrainees.get(r.program_id) ?? [];
    arr.push(r.trainee_id);
    trackToTrainees.set(r.program_id, arr);
  }

  const trackIds = [...trackToTrainees.keys()];
  if (trackIds.length === 0) {
    return NextResponse.json<CohortResponse>({
      center,
      centers,
      programs: [],
      migrationApplied,
      scopeLocked,
    });
  }

  // Track details
  const { data: tracks } = await supabase
    .from('program_tracks')
    .select('id, slug, name')
    .in('id', trackIds)
    .eq('is_active', true)
    .order('name');

  // Courses (programs) mapped to these tracks
  const { data: cpRows } = await supabase
    .from('course_programs')
    .select('program_id, track_id')
    .in('track_id', trackIds);
  const trackToCourses = new Map<string, string[]>();
  const allCourseIds = new Set<string>();
  for (const r of cpRows ?? []) {
    const arr = trackToCourses.get(r.track_id) ?? [];
    arr.push(r.program_id);
    trackToCourses.set(r.track_id, arr);
    allCourseIds.add(r.program_id);
  }

  // Course details
  const { data: courses } = allCourseIds.size
    ? await supabase
        .from('programs')
        .select('id, slug, title')
        .in('id', [...allCourseIds])
        .eq('is_active', true)
        .order('title')
    : { data: [] as { id: string; slug: string; title: string }[] };
  const courseById = new Map((courses ?? []).map(c => [c.id, c]));

  // Existing enrollments — for visible trainees only
  const { data: enrollments } = await supabase
    .from('trainee_programs')
    .select('trainee_id, program_id')
    .in('trainee_id', [...visibleTraineeIds]);
  const enrollmentsByTrainee = new Map<string, Set<string>>();
  for (const e of enrollments ?? []) {
    const set = enrollmentsByTrainee.get(e.trainee_id) ?? new Set<string>();
    set.add(e.program_id);
    enrollmentsByTrainee.set(e.trainee_id, set);
  }

  // ============================================================
  // Progress + "needs attention" computation
  // ============================================================

  // Sections for each course (programs.id) + reverse map section_id → program_id
  const courseIdsArr = [...allCourseIds];
  const { data: sections } = courseIdsArr.length
    ? await supabase
        .from('program_sections')
        .select('id, program_id')
        .in('program_id', courseIdsArr)
    : { data: [] as { id: string; program_id: string }[] };
  const sectionsByCourse = new Map<string, Set<string>>();
  const courseBySection = new Map<string, string>();
  for (const s of sections ?? []) {
    const set = sectionsByCourse.get(s.program_id) ?? new Set<string>();
    set.add(s.id);
    sectionsByCourse.set(s.program_id, set);
    courseBySection.set(s.id, s.program_id);
  }

  // Completed-progress rows for visible trainees only
  const { data: progressRows } = await supabase
    .from('progress')
    .select('trainee_id, section_id, status, started_at, completed_at')
    .in('trainee_id', [...visibleTraineeIds]);

  // Per (trainee, course) → completed count + last activity
  const completedByPair = new Map<string, number>();
  // Per (trainee, course) → "stuck" hint: in_progress section with old started_at
  const stuckPair = new Map<string, number /* days since started, max */>();
  for (const p of progressRows ?? []) {
    const courseId = courseBySection.get(p.section_id);
    if (!courseId) continue;
    const key = `${p.trainee_id}__${courseId}`;
    if (p.status === 'completed') {
      completedByPair.set(key, (completedByPair.get(key) ?? 0) + 1);
    } else if (p.status === 'in_progress') {
      const days = daysSince(p.started_at);
      if (days != null && days >= STUCK_DAYS) {
        const prev = stuckPair.get(key) ?? 0;
        if (days > prev) stuckPair.set(key, days);
      }
    }
  }

  // Voice scores for visible trainees (last 5 ai_score values per trainee, treated as recent)
  const visibleIds = [...visibleTraineeIds];
  const { data: responses } = await supabase
    .from('responses')
    .select('trainee_id, ai_score, exercise_type, created_at')
    .in('trainee_id', visibleIds)
    .eq('exercise_type', 'voice')
    .not('ai_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(Math.max(visibleIds.length, 1) * 5);
  const voiceScoresByTrainee = new Map<string, number[]>();
  for (const r of responses ?? []) {
    const arr = voiceScoresByTrainee.get(r.trainee_id) ?? [];
    if (arr.length < 5 && typeof r.ai_score === 'number') {
      arr.push(r.ai_score);
      voiceScoresByTrainee.set(r.trainee_id, arr);
    }
  }

  // Build per-track teacher entries with progress
  const programs: ProgramTrackBlock[] = sortProgramTracks(tracks ?? []).map(t => {
    const teacherIdsInTrack = trackToTrainees.get(t.id) ?? [];
    const trackCourseIds = trackToCourses.get(t.id) ?? [];
    const trackTeachers: TeacherEntry[] = teacherIdsInTrack
      .map(tid => {
        const meta = traineeById.get(tid);
        if (!meta) return null;

        const enrolled = enrollmentsByTrainee.get(tid) ?? new Set<string>();
        const assignedInTrack = trackCourseIds.filter(cid => enrolled.has(cid));

        // Per-course percentages (only for courses scoped to this track)
        const coursePct: Record<string, number> = {};
        let completedAcrossAssigned = 0;
        let totalAcrossAssigned = 0;
        let maxStuckDays = 0;

        for (const cid of trackCourseIds) {
          const total = sectionsByCourse.get(cid)?.size ?? 0;
          const completed = completedByPair.get(`${tid}__${cid}`) ?? 0;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          coursePct[cid] = pct;

          if (assignedInTrack.includes(cid)) {
            completedAcrossAssigned += completed;
            totalAcrossAssigned += total;
          }

          const stuck = stuckPair.get(`${tid}__${cid}`);
          if (stuck && stuck > maxStuckDays) maxStuckDays = stuck;
        }

        const overallPct =
          totalAcrossAssigned > 0
            ? Math.round((completedAcrossAssigned / totalAcrossAssigned) * 100)
            : 0;

        // Auto-flag "needs attention"
        let needsAttention: TeacherEntry['needsAttention'] = null;
        const inactiveDays = daysSince(meta.lastActiveAt);

        if (assignedInTrack.length > 0) {
          if (overallPct === 0 && (inactiveDays === null || inactiveDays >= STALLED_DAYS)) {
            needsAttention = {
              kind: 'stalled',
              reason: meta.lastActiveAt
                ? `Hasn't started — inactive ${Math.round(inactiveDays!)}d`
                : `Hasn't opened any course yet`,
            };
          } else if (maxStuckDays >= STUCK_DAYS) {
            needsAttention = {
              kind: 'stuck',
              reason: `Stuck on a section for ${Math.round(maxStuckDays)} days`,
            };
          }
        }

        if (!needsAttention) {
          const scores = voiceScoresByTrainee.get(tid);
          if (scores && scores.length >= 2) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg < LOW_SCORE_THRESHOLD) {
              needsAttention = {
                kind: 'low_score',
                reason: `Avg voice score ${avg.toFixed(1)}/5 over last ${scores.length} attempts`,
              };
            }
          }
        }

        return {
          id: meta.id,
          name: meta.name,
          email: meta.email,
          courseIds: [...enrolled],
          coursePct,
          overallPct,
          lastActiveAt: meta.lastActiveAt,
          needsAttention,
        } satisfies TeacherEntry;
      })
      .filter((x): x is TeacherEntry => x !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    const trackCourses = sortCourses(trackCourseIds
      .map(cid => courseById.get(cid))
      .filter((c): c is { id: string; slug: string; title: string } => Boolean(c)));

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      teachers: trackTeachers,
      courses: trackCourses,
    };
  });

  return NextResponse.json<CohortResponse>({
    center,
    centers,
    programs,
    migrationApplied,
    scopeLocked,
  });
}
