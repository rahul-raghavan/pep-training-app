import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';
import { clearProgramCache } from '@/lib/programs';

// GET - Single program
export async function GET(request: NextRequest, { params }: { params: Promise<{ programId: string }> }) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  return NextResponse.json({ program: data });
}

// PUT - Update program
export async function PUT(request: NextRequest, { params }: { params: Promise<{ programId: string }> }) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  try {
    const body = await request.json();
    const { slug, title, description, passing_score, is_active } = body;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('programs')
      .update({ slug, title, description, passing_score, is_active })
      .eq('id', programId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A program with this slug already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
    }

    clearProgramCache();
    return NextResponse.json({ program: data });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE - Delete program (super_admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ programId: string }> }) {
  const { error: authError } = await requireSuperAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', programId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 });
  }

  clearProgramCache();
  return NextResponse.json({ success: true });
}
