import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { clearProgramCache } from '@/lib/programs';

type Params = { params: Promise<{ programId: string; sectionId: string; exerciseId: string }> };

// PUT - Update an exercise
export async function PUT(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { sectionId, exerciseId } = await params;
  try {
    const body = await request.json();
    const {
      exercise_type, question, options, correct_index, explanation,
      scenario, guidance, ai_prompt, system_prompt, sample_answer, sort_order,
    } = body;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('program_exercises')
      .update({
        exercise_type, question, options, correct_index, explanation,
        scenario, guidance, ai_prompt, system_prompt, sample_answer, sort_order,
      })
      .eq('id', exerciseId)
      .eq('section_id', sectionId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 });
    }

    clearProgramCache();
    return NextResponse.json({ exercise: data });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE - Delete an exercise
export async function DELETE(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { sectionId, exerciseId } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('program_exercises')
    .delete()
    .eq('id', exerciseId)
    .eq('section_id', sectionId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete exercise' }, { status: 500 });
  }

  clearProgramCache();
  return NextResponse.json({ success: true });
}
