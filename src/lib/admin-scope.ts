import { NextResponse } from 'next/server';
import type { AuthUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

export function adminHasCompleteScope(user: AuthUser): boolean {
  return user.role === 'super_admin' || Boolean(user.adminScopeCenterIds.length > 0 && user.adminScopeTrackIds.length > 0);
}

export function adminScopeError() {
  return NextResponse.json(
    { error: 'Admin scope is incomplete. Assign both a center and at least one program track.' },
    { status: 403 }
  );
}

export async function getScopedTraineeIds(
  supabase: AdminClient,
  user: AuthUser
): Promise<Set<string> | null> {
  if (user.role === 'super_admin') return null;
  if (user.adminScopeCenterIds.length === 0 || user.adminScopeTrackIds.length === 0) {
    return new Set();
  }

  const { data: centerRows } = await supabase
    .from('teacher_centers')
    .select('trainee_id')
    .in('center_id', user.adminScopeCenterIds);
  const centerTraineeIds = (centerRows ?? []).map(row => row.trainee_id);
  if (centerTraineeIds.length === 0) return new Set();

  const { data: trackRows } = await supabase
    .from('teacher_programs')
    .select('trainee_id')
    .in('trainee_id', centerTraineeIds)
    .in('program_id', user.adminScopeTrackIds);

  return new Set((trackRows ?? []).map(row => row.trainee_id));
}

export async function isTraineeInAdminScope(
  supabase: AdminClient,
  user: AuthUser,
  traineeId: string
): Promise<boolean> {
  if (user.role === 'super_admin') return true;
  if (user.adminScopeCenterIds.length === 0 || user.adminScopeTrackIds.length === 0) return false;

  const [{ data: centerRow }, { data: trackRows }] = await Promise.all([
    supabase
      .from('teacher_centers')
      .select('center_id')
      .eq('trainee_id', traineeId)
      .single(),
    supabase
      .from('teacher_programs')
      .select('program_id')
      .eq('trainee_id', traineeId)
      .in('program_id', user.adminScopeTrackIds),
  ]);

  return Boolean(centerRow?.center_id && user.adminScopeCenterIds.includes(centerRow.center_id)) && (trackRows ?? []).length > 0;
}

export async function isCourseInAdminScope(
  supabase: AdminClient,
  user: AuthUser,
  programId: string
): Promise<boolean> {
  if (user.role === 'super_admin') return true;
  if (user.adminScopeTrackIds.length === 0) return false;

  const { data: rows } = await supabase
    .from('course_programs')
    .select('track_id')
    .eq('program_id', programId)
    .in('track_id', user.adminScopeTrackIds);

  return (rows ?? []).length > 0;
}

export async function isVoiceResponseInAdminScope(
  supabase: AdminClient,
  user: AuthUser,
  response: { trainee_id: string; section_id: string | null }
): Promise<boolean> {
  if (user.role === 'super_admin') return true;
  if (!(await isTraineeInAdminScope(supabase, user, response.trainee_id))) return false;
  if (!response.section_id) return false;

  const { data: section } = await supabase
    .from('program_sections')
    .select('program_id')
    .eq('id', response.section_id)
    .single();

  if (!section?.program_id) return false;
  return isCourseInAdminScope(supabase, user, section.program_id);
}
