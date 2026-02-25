import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  if (!user.traineeId) {
    return NextResponse.json({ programs: [] });
  }

  const supabase = createAdminClient();

  const { data: enrollments } = await supabase
    .from('trainee_programs')
    .select('program_id, programs(id, slug, title, description, is_active)')
    .eq('trainee_id', user.traineeId);

  const programs = (enrollments || [])
    .filter((e: Record<string, unknown>) => {
      const prog = e.programs as Record<string, unknown> | null;
      return prog?.is_active;
    })
    .map((e: Record<string, unknown>) => {
      const prog = e.programs as Record<string, unknown>;
      return {
        id: prog.id,
        slug: prog.slug,
        title: prog.title,
        description: prog.description,
      };
    });

  return NextResponse.json({ programs });
}
