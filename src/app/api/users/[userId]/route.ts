import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';
import { isTraineeInAdminScope } from '@/lib/admin-scope';

// GET - Get a specific user's profile + trainee details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { userId } = await params;
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get linked trainee
  const { data: trainee } = await supabase
    .from('trainees')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (user.role === 'admin' && (!trainee || !(await isTraineeInAdminScope(supabase, user, trainee.id)))) {
    return NextResponse.json({ error: 'User is not in your admin scope' }, { status: 403 });
  }

  // Get enrollments if trainee exists
  let enrollments: { program_id: string; title: string; slug: string }[] = [];
  if (trainee) {
    const { data: enrollmentData } = await supabase
      .from('trainee_programs')
      .select('program_id, programs(title, slug)')
      .eq('trainee_id', trainee.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrollments = (enrollmentData || []).map((e: any) => ({
      program_id: e.program_id,
      title: e.programs?.title || '',
      slug: e.programs?.slug || '',
    }));
  }

  return NextResponse.json({
    user: {
      ...profile,
      traineeId: trainee?.id || null,
      enrollments,
    },
  });
}

// PUT - Update user profile (role changes require super_admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  try {
    const body = await request.json();
    const { role, is_active, name } = body;

    // Role changes require super_admin
    if (role !== undefined) {
      const { error: superAuthError } = await requireSuperAdmin(request);
      if (superAuthError) return superAuthError;

      const validRoles = ['user', 'admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
    } else {
      const { user, error: authError } = await requireAdmin(request);
      if (authError) return authError;
      if (user.role === 'admin') {
        const supabase = createAdminClient();
        const { data: trainee } = await supabase
          .from('trainees')
          .select('id')
          .eq('user_id', userId)
          .single();
        if (!trainee || !(await isTraineeInAdminScope(supabase, user, trainee.id))) {
          return NextResponse.json({ error: 'User is not in your admin scope' }, { status: 403 });
        }
      }
    }

    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (name !== undefined) updateData.name = name;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Deactivate a user (super_admin only, soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { error: authError } = await requireSuperAdmin(request);
  if (authError) return authError;

  const { userId } = await params;
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)
    .select()
    .single();

  if (error || !profile) {
    console.error('Error deactivating user:', error);
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
  }

  return NextResponse.json({ message: 'User deactivated', user: profile });
}
