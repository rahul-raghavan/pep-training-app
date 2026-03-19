import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
// GET - Fetch all trainees with their progress
export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();

  // Fetch all trainees
  const { data: trainees, error: traineeError } = await supabase
    .from('trainees')
    .select('*')
    .order('created_at', { ascending: false });

  if (traineeError) {
    return NextResponse.json({ error: 'Failed to fetch trainees' }, { status: 500 });
  }

  // Fetch all progress
  const { data: progress } = await supabase.from('progress').select('*');

  // Fetch all responses for summary
  const { data: responses } = await supabase.from('responses').select('*');

  // Fetch program enrollments with program info
  const { data: enrollments } = await supabase
    .from('trainee_programs')
    .select('trainee_id, program_id, programs(title, slug)');

  // Build a map of trainee_id -> program info
  const traineePrograms: Record<string, { title: string; slug: string; program_id: string }[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (enrollments || []).forEach((e: any) => {
    if (!e.programs) return;
    if (!traineePrograms[e.trainee_id]) traineePrograms[e.trainee_id] = [];
    traineePrograms[e.trainee_id].push({ title: e.programs.title, slug: e.programs.slug, program_id: e.program_id });
  });

  // Fetch section counts per program
  const { data: programSections } = await supabase
    .from('program_sections')
    .select('program_id');

  const programSectionCounts: Record<string, number> = {};
  (programSections || []).forEach((s: { program_id: string }) => {
    programSectionCounts[s.program_id] = (programSectionCounts[s.program_id] || 0) + 1;
  });

  // Fetch actual program section IDs for accurate progress filtering
  const { data: allProgramSectionRows } = await supabase
    .from('program_sections')
    .select('id, program_id');

  const programSectionIdsByProgram: Record<string, Set<string>> = {};
  (allProgramSectionRows || []).forEach((s: { id: string; program_id: string }) => {
    if (!programSectionIdsByProgram[s.program_id]) programSectionIdsByProgram[s.program_id] = new Set();
    programSectionIdsByProgram[s.program_id].add(s.id);
  });

  // When ?all=true, return all trainees (for enroll modal). Otherwise only enrolled ones.
  const showAll = request.nextUrl.searchParams.get('all') === 'true';
  const enrolledTrainees = showAll
    ? (trainees || [])
    : (trainees?.filter(t => traineePrograms[t.id]) || []);

  // Calculate summary for each trainee
  const traineeSummaries = enrolledTrainees.map(trainee => {
    const traineeProgress = progress?.filter(p => p.trainee_id === trainee.id) || [];
    const traineeResponses = responses?.filter(r => r.trainee_id === trainee.id) || [];

    // Determine if trainee is enrolled in a DB program
    const enrolledPrograms = traineePrograms[trainee.id];
    const isDbProgram = enrolledPrograms && enrolledPrograms.length > 0;

    let totalSections: number;
    let completedSections: number;

    if (isDbProgram) {
      // Use program section counts — filter progress to only program section IDs
      const primaryProgram = enrolledPrograms[0];
      const sectionIdsForProgram = programSectionIdsByProgram[primaryProgram.program_id] || new Set();
      totalSections = sectionIdsForProgram.size;
      completedSections = traineeProgress.filter(
        p => sectionIdsForProgram.has(p.section_id) && p.status === 'completed'
      ).length;
    } else {
      // Not enrolled in any program
      totalSections = 0;
      completedSections = 0;
    }

    const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    // Calculate average score from voice exercises or MCQ accuracy
    const voiceResponses = traineeResponses.filter(r => r.exercise_type === 'voice' && r.ai_score);
    const mcqResponses = traineeResponses.filter(r => r.exercise_type === 'multiple_choice' && r.correct !== null);

    let avgScore: number | null = null;
    let scoreType: 'voice' | 'mcq' | null = null;
    if (voiceResponses.length > 0) {
      avgScore = Math.round(voiceResponses.reduce((sum, r) => sum + (r.ai_score || 0), 0) / voiceResponses.length * 10) / 10;
      scoreType = 'voice';
    } else if (mcqResponses.length > 0) {
      const correctCount = mcqResponses.filter(r => r.correct === true).length;
      avgScore = Math.round((correctCount / mcqResponses.length) * 100);
      scoreType = 'mcq';
    }

    // Determine status
    let status = 'not_started';
    if (completedSections === totalSections && totalSections > 0) {
      status = 'completed';
    } else if (completedSections > 0 || traineeProgress.some(p => p.status === 'in_progress')) {
      status = 'in_progress';
    }

    const programs = enrolledPrograms || [];

    return {
      ...trainee,
      completedSections,
      totalSections,
      progressPercent,
      avgScore,
      scoreType,
      status,
      exerciseCount: traineeResponses.length,
      programs,
    };
  });

  return NextResponse.json({ trainees: traineeSummaries });
}
