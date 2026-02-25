import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

// GET - List sections for a program
export async function GET(request: NextRequest, { params }: { params: Promise<{ programId: string }> }) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('program_sections')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }

  return NextResponse.json({ sections: data || [] });
}

// POST - Create a section
export async function POST(request: NextRequest, { params }: { params: Promise<{ programId: string }> }) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  try {
    const body = await request.json();
    const { slug, title, estimated_minutes, sort_order } = body;

    if (!slug || !title) {
      return NextResponse.json({ error: 'slug and title are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Auto-assign sort_order if not provided
    let order = sort_order;
    if (order === undefined || order === null) {
      const { data: existing } = await supabase
        .from('program_sections')
        .select('sort_order')
        .eq('program_id', programId)
        .order('sort_order', { ascending: false })
        .limit(1);
      order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
    }

    const { data, error } = await supabase
      .from('program_sections')
      .insert({ program_id: programId, slug, title, estimated_minutes, sort_order: order })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A section with this slug already exists in this program' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
    }

    return NextResponse.json({ section: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PUT - Reorder sections (expects { order: [{ id, sort_order }] })
export async function PUT(request: NextRequest, { params }: { params: Promise<{ programId: string }> }) {
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
          .from('program_sections')
          .update({ sort_order })
          .eq('id', id)
          .eq('program_id', programId)
      )
    );

    const { data } = await supabase
      .from('program_sections')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');

    return NextResponse.json({ sections: data || [] });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
