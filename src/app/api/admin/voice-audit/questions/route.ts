import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Voice audit is only available locally' }, { status: 404 });
  }

  const supabase = createAdminClient();

  const [{ data: programs }, { data: sections }, { data: exercises }] = await Promise.all([
    supabase
      .from('programs')
      .select('id, slug, title, is_active')
      .eq('is_active', true)
      .order('title'),
    supabase
      .from('program_sections')
      .select('id, program_id, slug, title, sort_order')
      .order('sort_order'),
    supabase
      .from('program_exercises')
      .select('id, section_id, sort_order, exercise_type, question, scenario, guidance, ai_prompt')
      .eq('exercise_type', 'voice')
      .order('sort_order'),
  ]);

  const programById = new Map((programs || []).map(program => [program.id, program]));
  const sectionById = new Map((sections || []).map(section => [section.id, section]));

  const questions = (exercises || [])
    .map(exercise => {
      const section = sectionById.get(exercise.section_id);
      const program = section ? programById.get(section.program_id) : null;
      if (!section || !program) return null;

      return {
        id: exercise.id,
        title: exercise.question,
        scenario: exercise.scenario,
        guidance: exercise.guidance,
        aiPrompt: exercise.ai_prompt,
        sortOrder: exercise.sort_order,
        section: {
          id: section.id,
          slug: section.slug,
          title: section.title,
          sortOrder: section.sort_order,
        },
        program: {
          id: program.id,
          slug: program.slug,
          title: program.title,
        },
      };
    })
    .filter(Boolean);

  const voiceCountByProgram = new Map<string, number>();
  questions.forEach(question => {
    if (!question) return;
    voiceCountByProgram.set(
      question.program.id,
      (voiceCountByProgram.get(question.program.id) || 0) + 1
    );
  });

  return NextResponse.json({
    programs: (programs || [])
      .filter(program => voiceCountByProgram.has(program.id))
      .map(program => ({
        id: program.id,
        slug: program.slug,
        title: program.title,
        voiceCount: voiceCountByProgram.get(program.id) || 0,
      })),
    questions,
  });
}
