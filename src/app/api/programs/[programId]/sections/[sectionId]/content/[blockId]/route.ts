import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

type Params = { params: Promise<{ programId: string; sectionId: string; blockId: string }> };

// PUT - Update a content block
export async function PUT(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { sectionId, blockId } = await params;
  try {
    const body = await request.json();
    const { block_type, content, variant, headers, rows, attribution, sort_order } = body;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('program_content_blocks')
      .update({ block_type, content, variant, headers, rows, attribution, sort_order })
      .eq('id', blockId)
      .eq('section_id', sectionId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update content block' }, { status: 500 });
    }

    return NextResponse.json({ block: data });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE - Delete a content block
export async function DELETE(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { sectionId, blockId } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('program_content_blocks')
    .delete()
    .eq('id', blockId)
    .eq('section_id', sectionId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete content block' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
