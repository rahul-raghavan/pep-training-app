import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import {
  getProgramBySlug,
  getProgramSections,
  getSectionBySlug,
  getSectionWithContent,
  dbBlockToContentBlock,
  dbExerciseToExercise,
  isTraineeEnrolled,
} from '@/lib/programs';
import { getProgramAccessStatus, prerequisiteLockedResponse } from '@/lib/program-prerequisites';

// GET - Combined endpoint for section page: trainee data + section content + filtered responses
// ?programSlug=X&sectionSlug=Y
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  const programSlug = request.nextUrl.searchParams.get('programSlug');
  const sectionSlug = request.nextUrl.searchParams.get('sectionSlug');

  if (!programSlug || !sectionSlug) {
    return NextResponse.json({ error: 'programSlug and sectionSlug are required' }, { status: 400 });
  }

  if (!user.traineeId) {
    return NextResponse.json({ error: 'No trainee record linked' }, { status: 404 });
  }

  // Look up program (cached)
  const program = await getProgramBySlug(programSlug);
  if (!program || !program.is_active) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Enrollment check
  if (!(await isTraineeEnrolled(user.traineeId, program.id))) {
    return NextResponse.json({ error: 'Not enrolled in this program' }, { status: 403 });
  }

  const accessStatus = await getProgramAccessStatus(user.traineeId, program);
  if (accessStatus.locked) {
    return NextResponse.json(prerequisiteLockedResponse(accessStatus), { status: 423 });
  }

  // Get sections list (cached) and find the requested section (cached)
  const [sections, section] = await Promise.all([
    getProgramSections(program.id),
    getSectionBySlug(program.id, sectionSlug),
  ]);

  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  // Fetch section content (cached) + trainee data (dynamic) in parallel
  const supabase = createAdminClient();
  const [sectionData, { data: trainee }, { data: progress }, { data: responses }] = await Promise.all([
    getSectionWithContent(section.id),
    supabase.from('trainees').select('*').eq('id', user.traineeId).single(),
    supabase.from('progress').select('*').eq('trainee_id', user.traineeId),
    supabase.from('responses').select('*').eq('trainee_id', user.traineeId).eq('section_id', section.id),
  ]);

  if (!sectionData || !trainee) {
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }

  // Update last active timestamp (fire and forget)
  supabase
    .from('trainees')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', user.traineeId)
    .then(() => {}, () => {});

  // Navigation
  const sectionIndex = sections.findIndex(s => s.id === section.id);
  const prevSection = sectionIndex > 0 ? sections[sectionIndex - 1] : null;
  const nextSection = sectionIndex < sections.length - 1 ? sections[sectionIndex + 1] : null;

  return NextResponse.json({
    trainee,
    progress: progress || [],
    responses: responses || [],
    section: {
      id: section.id,
      slug: section.slug,
      title: section.title,
      estimatedMinutes: section.estimated_minutes,
      index: sectionIndex,
      totalSections: sections.length,
    },
    content: sectionData.contentBlocks.map(dbBlockToContentBlock),
    exercises: sectionData.exercises.map(dbExerciseToExercise),
    navigation: {
      prev: prevSection ? { slug: prevSection.slug, title: prevSection.title } : null,
      next: nextSection ? { slug: nextSection.slug, title: nextSection.title } : null,
    },
  });
}
