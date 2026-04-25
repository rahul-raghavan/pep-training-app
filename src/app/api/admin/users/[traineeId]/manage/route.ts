import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/auth';

/**
 * PUT /api/admin/users/[traineeId]/manage
 * Body: { isActive?, isTestAccount? }
 *
 * Super-admin-only quick actions for a user:
 *   - isActive flips profiles.is_active (deactivate / reactivate)
 *   - isTestAccount flips trainees.is_test_account (hide from stats)
 *
 * Both fields are optional; either can be sent independently.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ traineeId: string }> }
) {
  const { user, error: authError } = await requireSuperAdmin(request);
  if (authError) return authError;

  const { traineeId } = await params;
  const supabase = createAdminClient();

  let body: { isActive?: boolean; isTestAccount?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: trainee } = await supabase
    .from('trainees')
    .select('id, user_id, email')
    .eq('id', traineeId)
    .single();

  if (!trainee) {
    return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
  }

  // Guard: don't let a super-admin deactivate themselves through this endpoint.
  if (body.isActive === false && trainee.user_id === user.id) {
    return NextResponse.json(
      { error: "You can't deactivate your own account here." },
      { status: 400 }
    );
  }

  if (typeof body.isActive === 'boolean') {
    if (!trainee.user_id) {
      return NextResponse.json(
        { error: "User hasn't signed in yet — nothing to deactivate." },
        { status: 400 }
      );
    }
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: body.isActive })
      .eq('id', trainee.user_id);
    if (error) {
      console.error('manage: profile update error', error);
      return NextResponse.json({ error: 'Failed to update active status' }, { status: 500 });
    }
  }

  if (typeof body.isTestAccount === 'boolean') {
    const { error } = await supabase
      .from('trainees')
      .update({ is_test_account: body.isTestAccount })
      .eq('id', traineeId);
    if (error) {
      // Column missing → migration not yet applied. Surface as 400 so UI can show.
      if (error.code === '42703') {
        return NextResponse.json(
          { error: 'is_test_account column missing — apply the schema migration first' },
          { status: 400 }
        );
      }
      console.error('manage: test_account update error', error);
      return NextResponse.json({ error: 'Failed to update test-account flag' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
