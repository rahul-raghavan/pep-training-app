import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/auth';

// DELETE - Permanently delete a pre-registered (pending) user
// Only works for trainees with no linked auth user (user_id IS NULL)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ traineeId: string }> }
) {
  const { error: authError } = await requireSuperAdmin(request);
  if (authError) return authError;

  const { traineeId } = await params;
  const supabase = createAdminClient();

  // Verify this is actually a pending trainee (no linked auth user)
  const { data: trainee, error: fetchError } = await supabase
    .from('trainees')
    .select('id, user_id')
    .eq('id', traineeId)
    .single();

  if (fetchError || !trainee) {
    return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
  }

  if (trainee.user_id) {
    return NextResponse.json(
      { error: 'Cannot delete a user who has logged in. Deactivate them instead.' },
      { status: 400 }
    );
  }

  // Delete enrollments first, then the trainee record
  await supabase.from('trainee_programs').delete().eq('trainee_id', traineeId);
  await supabase.from('progress').delete().eq('trainee_id', traineeId);
  await supabase.from('responses').delete().eq('trainee_id', traineeId);

  const { error: deleteError } = await supabase
    .from('trainees')
    .delete()
    .eq('id', traineeId);

  if (deleteError) {
    console.error('Error deleting pending trainee:', deleteError);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
