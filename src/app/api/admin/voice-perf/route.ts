import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

interface TeacherRow {
  id: string;
  name: string;
  email: string;
  attempts: number;
  avgScore: number | null;
  /** Mean of second-half attempts minus mean of first-half (in window). Positive = improving. */
  trend: number;
  /** Last up-to-12 scores, oldest → newest. */
  series: number[];
  /** Section title with lowest avg score in window, if any. */
  weakestSection: string | null;
  flag: 'needs-attention' | 'idle' | null;
}

interface VoicePerfPayload {
  center: { id: string; slug: string; name: string } | null;
  centers: { id: string; slug: string; name: string }[];
  filterDays: number;
  scopeLocked: boolean;
  migrationApplied: boolean;
  stats: {
    teachersActive: { count: number; total: number };
    totalAttempts: number;
    meanScore: number | null;
    belowThreshold: number;
  };
  distribution: { bucket: string; n: number; pct: number }[];
  teachers: TeacherRow[];
  triage: { teacherId: string; name: string; reason: string }[];
}

const VALID_WINDOWS = [7, 30, 90, 365];
const LOW_SCORE_THRESHOLD = 3;
const SPARKLINE_LIMIT = 12;

/**
 * GET /api/admin/voice-perf?centerId=...&days=30
 * Cohort voice-performance roll-up.
 */
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const requestedCenterId = request.nextUrl.searchParams.get('centerId');
  const daysParam = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const filterDays = VALID_WINDOWS.includes(daysParam) ? daysParam : 30;
  const windowStart = new Date(Date.now() - filterDays * 24 * 60 * 60 * 1000).toISOString();

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
    return NextResponse.json<VoicePerfPayload>({
      center: null,
      centers: [],
      filterDays,
      scopeLocked: false,
      migrationApplied: false,
      stats: { teachersActive: { count: 0, total: 0 }, totalAttempts: 0, meanScore: null, belowThreshold: 0 },
      distribution: [],
      teachers: [],
      triage: [],
    });
  }

  let centerId: string | null;
  let scopeLocked = false;
  if (user.role === 'super_admin') {
    centerId = requestedCenterId ?? centers[0]?.id ?? null;
  } else {
    centerId = user.adminScopeCenterId ?? null;
    scopeLocked = true;
  }
  const center = centers.find(c => c.id === centerId) ?? null;

  if (!centerId) {
    return NextResponse.json<VoicePerfPayload>({
      center,
      centers,
      filterDays,
      scopeLocked,
      migrationApplied,
      stats: { teachersActive: { count: 0, total: 0 }, totalAttempts: 0, meanScore: null, belowThreshold: 0 },
      distribution: [],
      teachers: [],
      triage: [],
    });
  }
  if (user.role === 'admin' && user.adminScopeTrackIds.length === 0) {
    return NextResponse.json<VoicePerfPayload>({
      center,
      centers,
      filterDays,
      scopeLocked,
      migrationApplied,
      stats: { teachersActive: { count: 0, total: 0 }, totalAttempts: 0, meanScore: null, belowThreshold: 0 },
      distribution: [],
      teachers: [],
      triage: [],
    });
  }

  // Trainees in this center
  const { data: tcRows } = await supabase
    .from('teacher_centers')
    .select('trainee_id')
    .eq('center_id', centerId);
  const traineeIdsAll = (tcRows ?? []).map(r => r.trainee_id);

  if (traineeIdsAll.length === 0) {
    return NextResponse.json<VoicePerfPayload>({
      center,
      centers,
      filterDays,
      scopeLocked,
      migrationApplied,
      stats: { teachersActive: { count: 0, total: 0 }, totalAttempts: 0, meanScore: null, belowThreshold: 0 },
      distribution: [],
      teachers: [],
      triage: [],
    });
  }

  // Filter test accounts. Fall back if column missing.
  let trainees: { id: string; name: string; email: string | null }[] = [];
  {
    const full = await supabase
      .from('trainees')
      .select('id, name, email')
      .in('id', traineeIdsAll)
      .eq('is_test_account', false);
    if (full.error?.code === '42703') {
      const fallback = await supabase
        .from('trainees')
        .select('id, name, email')
        .in('id', traineeIdsAll);
      trainees = fallback.data ?? [];
    } else {
      trainees = full.data ?? [];
    }
  }

  // Restrict to admin's managed tracks
  if (user.role === 'admin') {
    const { data: tps } = await supabase
      .from('teacher_programs')
      .select('trainee_id, program_id')
      .in('trainee_id', trainees.map(t => t.id))
      .in('program_id', user.adminScopeTrackIds);
    const inScope = new Set((tps ?? []).map(r => r.trainee_id));
    trainees = trainees.filter(t => inScope.has(t.id));
  }

  if (trainees.length === 0) {
    return NextResponse.json<VoicePerfPayload>({
      center,
      centers,
      filterDays,
      scopeLocked,
      migrationApplied,
      stats: { teachersActive: { count: 0, total: 0 }, totalAttempts: 0, meanScore: null, belowThreshold: 0 },
      distribution: [],
      teachers: [],
      triage: [],
    });
  }

  const traineeIds = trainees.map(t => t.id);

  // Voice responses in window
  const { data: responses } = await supabase
    .from('responses')
    .select('id, trainee_id, section_id, ai_score, created_at')
    .in('trainee_id', traineeIds)
    .eq('exercise_type', 'voice')
    .not('ai_score', 'is', null)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: true });

  const validResponses = (responses ?? []).filter(
    (r): r is { id: string; trainee_id: string; section_id: string; ai_score: number; created_at: string } =>
      typeof r.ai_score === 'number'
  );

  // Section title lookup for "weakest section"
  const sectionIdSet = new Set(validResponses.map(r => r.section_id));
  const sectionTitleById = new Map<string, string>();
  if (sectionIdSet.size > 0) {
    const { data: secs } = await supabase
      .from('program_sections')
      .select('id, title')
      .in('id', [...sectionIdSet]);
    for (const s of secs ?? []) sectionTitleById.set(s.id, s.title);
  }

  // Per-teacher aggregation
  type TeacherAgg = {
    scores: number[];
    times: string[];
    bySection: Map<string, number[]>;
  };
  const byTeacher = new Map<string, TeacherAgg>();
  for (const r of validResponses) {
    const cur: TeacherAgg =
      byTeacher.get(r.trainee_id) ?? { scores: [], times: [], bySection: new Map<string, number[]>() };
    cur.scores.push(r.ai_score);
    cur.times.push(r.created_at);
    const arr: number[] = cur.bySection.get(r.section_id) ?? [];
    arr.push(r.ai_score);
    cur.bySection.set(r.section_id, arr);
    byTeacher.set(r.trainee_id, cur);
  }

  const teachers: TeacherRow[] = trainees
    .map(t => {
      const data = byTeacher.get(t.id);
      if (!data) {
        return {
          id: t.id,
          name: t.name,
          email: t.email ?? '',
          attempts: 0,
          avgScore: null,
          trend: 0,
          series: [],
          weakestSection: null,
          flag: 'idle' as const,
        };
      }
      const { scores, bySection } = data;
      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null;

      // Trend = mean(second half) - mean(first half) when ≥ 4 attempts; else 0
      let trend = 0;
      if (scores.length >= 4) {
        const mid = Math.floor(scores.length / 2);
        const firstHalf = scores.slice(0, mid);
        const secondHalf = scores.slice(mid);
        const m1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const m2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        trend = Math.round((m2 - m1) * 10) / 10;
      }

      const series = scores.slice(-SPARKLINE_LIMIT);

      // Weakest section: lowest avg with at least 2 attempts
      let weakestSection: string | null = null;
      let weakestAvg = Infinity;
      for (const [secId, arr] of bySection.entries()) {
        if (arr.length < 2) continue;
        const a = arr.reduce((a, b) => a + b, 0) / arr.length;
        if (a < weakestAvg) {
          weakestAvg = a;
          weakestSection = sectionTitleById.get(secId) ?? null;
        }
      }

      const flag: TeacherRow['flag'] =
        avgScore !== null && avgScore < LOW_SCORE_THRESHOLD ? 'needs-attention' : null;

      return {
        id: t.id,
        name: t.name,
        email: t.email ?? '',
        attempts: scores.length,
        avgScore,
        trend,
        series,
        weakestSection,
        flag,
      };
    })
    .sort((a, b) => {
      // Needs-attention first, then idle, then by avg ascending so weak ones surface
      const order = (r: TeacherRow) =>
        r.flag === 'needs-attention' ? 0 : r.flag === 'idle' ? 2 : 1;
      const o = order(a) - order(b);
      if (o !== 0) return o;
      return (a.avgScore ?? 99) - (b.avgScore ?? 99);
    });

  // Distribution histogram (5/5 → 1/5)
  const buckets = [5, 4, 3, 2, 1].map(s => {
    const n = validResponses.filter(r => r.ai_score === s).length;
    return {
      bucket: `${s}/5`,
      n,
      pct: validResponses.length > 0 ? Math.round((n / validResponses.length) * 100) : 0,
    };
  });

  // Stats
  const teachersActiveCount = teachers.filter(t => t.attempts > 0).length;
  const meanScore =
    validResponses.length > 0
      ? Math.round(
          (validResponses.reduce((a, r) => a + r.ai_score, 0) / validResponses.length) * 10
        ) / 10
      : null;
  const belowThreshold = teachers.filter(
    t => t.avgScore !== null && t.avgScore < LOW_SCORE_THRESHOLD
  ).length;

  // Triage queue: 3 most "concerning"
  const triage: VoicePerfPayload['triage'] = [];
  for (const t of teachers) {
    if (triage.length >= 3) break;
    if (t.flag === 'needs-attention') {
      triage.push({
        teacherId: t.id,
        name: t.name,
        reason:
          t.attempts >= 3
            ? `Avg ${t.avgScore}/5 over ${t.attempts} attempts${
                t.trend < 0 ? ', trending down' : ''
              }`
            : `Only ${t.attempts} attempts, avg ${t.avgScore}/5`,
      });
    }
  }
  if (triage.length < 3) {
    for (const t of teachers) {
      if (triage.length >= 3) break;
      if (t.flag === 'idle' && !triage.find(x => x.teacherId === t.id)) {
        triage.push({
          teacherId: t.id,
          name: t.name,
          reason: `No voice attempts in last ${filterDays}d`,
        });
      }
    }
  }

  return NextResponse.json<VoicePerfPayload>({
    center,
    centers,
    filterDays,
    scopeLocked,
    migrationApplied,
    stats: {
      teachersActive: { count: teachersActiveCount, total: teachers.length },
      totalAttempts: validResponses.length,
      meanScore,
      belowThreshold,
    },
    distribution: buckets,
    teachers,
    triage,
  });
}
