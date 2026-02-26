import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { clearProgramCache } from '@/lib/programs';

type Params = { params: Promise<{ programId: string; sectionId: string }> };

// POST - Add a content block
export async function POST(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { sectionId } = await params;
  try {
    const body = await request.json();
    const { block_type, content, variant, headers, rows, attribution, sort_order } = body;

    if (!block_type) {
      return NextResponse.json({ error: 'block_type is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Auto-assign sort_order if not provided
    let order = sort_order;
    if (order === undefined || order === null) {
      const { data: existing } = await supabase
        .from('program_content_blocks')
        .select('sort_order')
        .eq('section_id', sectionId)
        .order('sort_order', { ascending: false })
        .limit(1);
      order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
    }

    const { data, error } = await supabase
      .from('program_content_blocks')
      .insert({ section_id: sectionId, sort_order: order, block_type, content, variant, headers, rows, attribution })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create content block' }, { status: 500 });
    }

    clearProgramCache();
    return NextResponse.json({ block: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PUT - Reorder content blocks (expects { order: [{ id, sort_order }] })
export async function PUT(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { sectionId } = await params;
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
          .from('program_content_blocks')
          .update({ sort_order })
          .eq('id', id)
          .eq('section_id', sectionId)
      )
    );

    const { data } = await supabase
      .from('program_content_blocks')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order');

    clearProgramCache();
    return NextResponse.json({ blocks: data || [] });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
