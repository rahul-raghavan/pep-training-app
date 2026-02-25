import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

type Params = { params: Promise<{ programId: string; questionId: string }> };

// PUT - Update an assessment question
export async function PUT(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId, questionId } = await params;
  try {
    const body = await request.json();
    const { question, options, correct_index, explanation, module_label, sort_order } = body;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('program_assessment_questions')
      .update({ question, options, correct_index, explanation, module_label, sort_order })
      .eq('id', questionId)
      .eq('program_id', programId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update assessment question' }, { status: 500 });
    }

    return NextResponse.json({ question: data });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE - Delete an assessment question
export async function DELETE(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId, questionId } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('program_assessment_questions')
    .delete()
    .eq('id', questionId)
    .eq('program_id', programId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete assessment question' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
