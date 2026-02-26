import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { clearProgramCache } from '@/lib/programs';

type Params = { params: Promise<{ programId: string; sectionId: string }> };

// GET - Single section with content blocks and exercises
export async function GET(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { sectionId } = await params;
  const supabase = createAdminClient();

  const { data: section, error } = await supabase
    .from('program_sections')
    .select('*')
    .eq('id', sectionId)
    .single();

  if (error || !section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  const [{ data: contentBlocks }, { data: exercises }] = await Promise.all([
    supabase
      .from('program_content_blocks')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order'),
    supabase
      .from('program_exercises')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order'),
  ]);

  return NextResponse.json({
    section,
    contentBlocks: contentBlocks || [],
    exercises: exercises || [],
  });
}

// PUT - Update section metadata
export async function PUT(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId, sectionId } = await params;
  try {
    const body = await request.json();
    const { slug, title, estimated_minutes, sort_order } = body;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('program_sections')
      .update({ slug, title, estimated_minutes, sort_order })
      .eq('id', sectionId)
      .eq('program_id', programId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A section with this slug already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
    }

    clearProgramCache();
    return NextResponse.json({ section: data });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE - Delete section (cascades to content and exercises)
export async function DELETE(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId, sectionId } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('program_sections')
    .delete()
    .eq('id', sectionId)
    .eq('program_id', programId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }

  clearProgramCache();
  return NextResponse.json({ success: true });
}
