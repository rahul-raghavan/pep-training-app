import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { getProgramAccessStatus } from '@/lib/program-prerequisites';

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  if (!user.traineeId) {
    return NextResponse.json({ programs: [] });
  }

  const supabase = createAdminClient();

  const { data: enrollments } = await supabase
    .from('trainee_programs')
    .select('program_id, programs(id, slug, title, description, is_active, passing_score)')
    .eq('trainee_id', user.traineeId);

  const activeEnrollments = (enrollments || []).filter((e: Record<string, unknown>) => {
    const prog = e.programs as Record<string, unknown> | null;
    return prog?.is_active;
  });

  if (activeEnrollments.length === 0) {
    return NextResponse.json({ programs: [] });
  }

  const programIds = activeEnrollments.map((e: Record<string, unknown>) => {
    const prog = e.programs as Record<string, unknown>;
    return prog.id as string;
  });

  // Fetch section counts per program
  const { data: allSections } = await supabase
    .from('program_sections')
    .select('id, program_id')
    .in('program_id', programIds);

  const sectionCountMap: Record<string, number> = {};
  const sectionIdsMap: Record<string, string[]> = {};
  (allSections || []).forEach((s: { id: string; program_id: string }) => {
    sectionCountMap[s.program_id] = (sectionCountMap[s.program_id] || 0) + 1;
    if (!sectionIdsMap[s.program_id]) sectionIdsMap[s.program_id] = [];
    sectionIdsMap[s.program_id].push(s.id);
  });

  // Fetch progress for this trainee across all program sections
  const allSectionIds = (allSections || []).map((s: { id: string }) => s.id);
  const { data: progressData } = await supabase
    .from('progress')
    .select('section_id, status')
    .eq('trainee_id', user.traineeId)
    .in('section_id', allSectionIds.length > 0 ? allSectionIds : ['_none_']);

  const completedByProgram: Record<string, number> = {};
  const startedByProgram: Record<string, number> = {};
  (progressData || []).forEach((p: { section_id: string; status: string }) => {
    // Find which program this section belongs to
    for (const [programId, sectionIds] of Object.entries(sectionIdsMap)) {
      if (sectionIds.includes(p.section_id)) {
        if (p.status === 'completed') {
          completedByProgram[programId] = (completedByProgram[programId] || 0) + 1;
        }
        if (p.status === 'in_progress' || p.status === 'completed') {
          startedByProgram[programId] = (startedByProgram[programId] || 0) + 1;
        }
        break;
      }
    }
  });

  // Fetch best assessment attempts per program
  const { data: attempts } = await supabase
    .from('assessment_attempts')
    .select('program_id, score, total')
    .eq('trainee_id', user.traineeId)
    .in('program_id', programIds);

  // Find best score per program
  const bestAttemptMap: Record<string, { score: number; total: number }> = {};
  (attempts || []).forEach((a: { program_id: string; score: number; total: number }) => {
    const existing = bestAttemptMap[a.program_id];
    if (!existing || a.score > existing.score) {
      bestAttemptMap[a.program_id] = { score: a.score, total: a.total };
    }
  });

  const programs = await Promise.all(activeEnrollments.map(async (e: Record<string, unknown>) => {
    const prog = e.programs as Record<string, unknown>;
    const programId = prog.id as string;
    const totalSections = sectionCountMap[programId] || 0;
    const completedSections = completedByProgram[programId] || 0;
    const startedSections = startedByProgram[programId] || 0;
    const passingScore = (prog.passing_score as number) || 80;
    const bestAttempt = bestAttemptMap[programId];

    const passed = bestAttempt
      ? (bestAttempt.score / bestAttempt.total) * 100 >= passingScore
      : false;
    const accessStatus = await getProgramAccessStatus(user.traineeId!, { slug: prog.slug as string });

    // Determine status
    let status: string;
    if (accessStatus.locked) {
      status = 'locked';
    } else if (passed) {
      status = 'passed';
    } else if (completedSections === totalSections && totalSections > 0) {
      status = 'sections_complete';
    } else if (startedSections > 0) {
      status = 'in_progress';
    } else {
      status = 'not_started';
    }

    return {
      id: programId,
      slug: prog.slug,
      title: prog.title,
      description: prog.description,
      totalSections,
      completedSections,
      status,
      locked: accessStatus.locked,
      prerequisite: accessStatus.prerequisite,
      bestScore: bestAttempt ? bestAttempt.score : null,
      bestTotal: bestAttempt ? bestAttempt.total : null,
    };
  }));

  return NextResponse.json({ programs });
}
