import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

type Params = { params: Promise<{ programId: string }> };

// GET - List assessment questions
export async function GET(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('program_assessment_questions')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch assessment questions' }, { status: 500 });
  }

  return NextResponse.json({ questions: data || [] });
}

// POST - Add an assessment question
export async function POST(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  try {
    const body = await request.json();
    const { question, options, correct_index, explanation, module_label, sort_order } = body;

    if (!question || !options || correct_index === undefined || !explanation) {
      return NextResponse.json({ error: 'question, options, correct_index, and explanation are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Auto-assign sort_order if not provided
    let order = sort_order;
    if (order === undefined || order === null) {
      const { data: existing } = await supabase
        .from('program_assessment_questions')
        .select('sort_order')
        .eq('program_id', programId)
        .order('sort_order', { ascending: false })
        .limit(1);
      order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
    }

    const { data, error } = await supabase
      .from('program_assessment_questions')
      .insert({ program_id: programId, sort_order: order, question, options, correct_index, explanation, module_label })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create assessment question' }, { status: 500 });
    }

    return NextResponse.json({ question: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PUT - Reorder assessment questions (expects { order: [{ id, sort_order }] })
export async function PUT(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  try {
    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order array is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    await Promise.all(
      order.map(({ id, sort_order }: { id: string; sort_order: number }) =>
        supabase
          .from('program_assessment_questions')
          .update({ sort_order })
          .eq('id', id)
          .eq('program_id', programId)
      )
    );

    const { data } = await supabase
      .from('program_assessment_questions')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');

    return NextResponse.json({ questions: data || [] });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
