import { createAdminClient } from '@/lib/supabase/admin';

export type ProgramPrerequisite = {
  slug: string;
  title: string;
  enrolled: boolean;
  passed: boolean;
};

export type ProgramAccessStatus = {
  locked: boolean;
  prerequisite: ProgramPrerequisite | null;
};

const PREREQUISITE_BY_PROGRAM_SLUG: Record<string, string> = {
  // Learning Science sequence. LS 101 is the first course in this series.
  'how-learning-works': 'learning-science-101',
  'formative-assessment': 'how-learning-works',
  'feedback-student-ownership': 'formative-assessment',
  'designing-durable-learning': 'feedback-student-ownership',
  'leading-teacher-learning': 'designing-durable-learning',

  // Elementary sequence. The separate ELEM 001 crash course is intentionally not part of this chain.
  'elem-102': 'elem-101',
  'elem-103': 'elem-102',
  'elem-104': 'elem-103',

  // Middle School sequence. The separate MS 101 crash course is intentionally not part of this chain.
  'ms-202': 'ms-201',
  'ms-203': 'ms-202',
  'ms-204': 'ms-203',
  'ms-205': 'ms-204',
  'ms-206': 'ms-205',
};

export function getPrerequisiteSlug(programSlug: string): string | null {
  return PREREQUISITE_BY_PROGRAM_SLUG[programSlug] || null;
}

export async function getProgramAccessStatus(
  traineeId: string,
  program: { slug: string }
): Promise<ProgramAccessStatus> {
  const prerequisiteSlug = getPrerequisiteSlug(program.slug);
  if (!prerequisiteSlug) {
    return { locked: false, prerequisite: null };
  }

  const supabase = createAdminClient();

  const { data: prerequisiteProgram } = await supabase
    .from('programs')
    .select('id, slug, title, passing_score')
    .eq('slug', prerequisiteSlug)
    .single();

  if (!prerequisiteProgram) {
    return {
      locked: true,
      prerequisite: {
        slug: prerequisiteSlug,
        title: prerequisiteSlug,
        enrolled: false,
        passed: false,
      },
    };
  }

  const [{ data: enrollment }, { data: attempts }] = await Promise.all([
    supabase
      .from('trainee_programs')
      .select('id')
      .eq('trainee_id', traineeId)
      .eq('program_id', prerequisiteProgram.id)
      .single(),
    supabase
      .from('assessment_attempts')
      .select('score, total')
      .eq('trainee_id', traineeId)
      .eq('program_id', prerequisiteProgram.id),
  ]);

  const passingScore = prerequisiteProgram.passing_score || 80;
  const passed = (attempts || []).some((attempt: { score: number; total: number }) => {
    if (!attempt.total) return false;
    return (attempt.score / attempt.total) * 100 >= passingScore;
  });

  return {
    locked: !passed,
    prerequisite: {
      slug: prerequisiteProgram.slug,
      title: prerequisiteProgram.title,
      enrolled: Boolean(enrollment),
      passed,
    },
  };
}

export function prerequisiteLockedResponse(status: ProgramAccessStatus) {
  return {
    error: 'Prerequisite not passed',
    locked: true,
    prerequisite: status.prerequisite,
  };
}
