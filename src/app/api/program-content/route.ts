import { NextRequest, NextResponse } from 'next/server';
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

// GET - Fetch program content for trainees (read-only)
// ?programSlug=X — returns program with section list
// ?programSlug=X&sectionSlug=Y — returns single section with content + exercises
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  const programSlug = request.nextUrl.searchParams.get('programSlug');
  const sectionSlug = request.nextUrl.searchParams.get('sectionSlug');

  if (!programSlug) {
    return NextResponse.json({ error: 'programSlug is required' }, { status: 400 });
  }

  const program = await getProgramBySlug(programSlug);
  if (!program || !program.is_active) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Enrollment check
  if (!user.traineeId || !(await isTraineeEnrolled(user.traineeId, program.id))) {
    return NextResponse.json({ error: 'Not enrolled in this program' }, { status: 403 });
  }

  const sections = await getProgramSections(program.id);

  // If no section slug, return program overview with section list
  if (!sectionSlug) {
    return NextResponse.json({
      program: {
        id: program.id,
        slug: program.slug,
        title: program.title,
        description: program.description,
        passing_score: program.passing_score,
      },
      sections: sections.map(s => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        estimatedMinutes: s.estimated_minutes,
        sort_order: s.sort_order,
      })),
    });
  }

  // Return specific section with content and exercises
  const section = await getSectionBySlug(program.id, sectionSlug);
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  const sectionData = await getSectionWithContent(section.id);
  if (!sectionData) {
    return NextResponse.json({ error: 'Failed to load section content' }, { status: 500 });
  }

  // Find section index for navigation
  const sectionIndex = sections.findIndex(s => s.id === section.id);
  const prevSection = sectionIndex > 0 ? sections[sectionIndex - 1] : null;
  const nextSection = sectionIndex < sections.length - 1 ? sections[sectionIndex + 1] : null;

  return NextResponse.json({
    program: {
      id: program.id,
      slug: program.slug,
      title: program.title,
    },
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
