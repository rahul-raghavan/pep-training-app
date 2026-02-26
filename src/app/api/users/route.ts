import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';

// GET - List all users with their profiles
export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  // Get linked trainee IDs
  const userIds = profiles?.map(p => p.id) || [];
  const { data: trainees } = await supabase
    .from('trainees')
    .select('id, user_id, name, email')
    .in('user_id', userIds);

  const traineeMap: Record<string, string> = {};
  (trainees || []).forEach((t: { id: string; user_id: string }) => {
    if (t.user_id) traineeMap[t.user_id] = t.id;
  });

  // Get enrollment counts
  const traineeIds = (trainees || []).map((t: { id: string }) => t.id);
  const { data: enrollments } = await supabase
    .from('trainee_programs')
    .select('trainee_id, program_id, programs(title, slug)')
    .in('trainee_id', traineeIds);

  const enrollmentMap: Record<string, { program_id: string; title: string; slug: string }[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (enrollments || []).forEach((e: any) => {
    if (!e.programs) return;
    if (!enrollmentMap[e.trainee_id]) enrollmentMap[e.trainee_id] = [];
    enrollmentMap[e.trainee_id].push({
      program_id: e.program_id,
      title: e.programs.title,
      slug: e.programs.slug,
    });
  });

  const users = profiles?.map(profile => ({
    ...profile,
    traineeId: traineeMap[profile.id] || null,
    enrollments: enrollmentMap[traineeMap[profile.id]] || [],
    pending: false,
  }));

  // Also fetch pre-registered trainees (no user_id = haven't logged in yet)
  const { data: pendingTrainees } = await supabase
    .from('trainees')
    .select('id, name, email, pre_assigned_role, created_at')
    .is('user_id', null)
    .order('created_at', { ascending: false });

  // Get enrollments for pending trainees too
  const pendingTraineeIds = (pendingTrainees || []).map((t: { id: string }) => t.id);
  const { data: pendingEnrollments } = pendingTraineeIds.length > 0
    ? await supabase
        .from('trainee_programs')
        .select('trainee_id, program_id, programs(title, slug)')
        .in('trainee_id', pendingTraineeIds)
    : { data: [] };

  const pendingEnrollmentMap: Record<string, { program_id: string; title: string; slug: string }[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pendingEnrollments || []).forEach((e: any) => {
    if (!e.programs) return;
    if (!pendingEnrollmentMap[e.trainee_id]) pendingEnrollmentMap[e.trainee_id] = [];
    pendingEnrollmentMap[e.trainee_id].push({
      program_id: e.program_id,
      title: e.programs.title,
      slug: e.programs.slug,
    });
  });

  const pendingUsers = (pendingTrainees || []).map((t: { id: string; name: string; email: string; pre_assigned_role: string | null; created_at: string }) => ({
    id: `pending_${t.id}`,
    traineeId: t.id,
    email: t.email,
    name: t.name,
    role: t.pre_assigned_role || 'user',
    is_active: true,
    created_at: t.created_at,
    enrollments: pendingEnrollmentMap[t.id] || [],
    pending: true,
  }));

  return NextResponse.json({ users: [...(users || []), ...pendingUsers] });
}

// POST - Pre-register a new user (super_admin only)
export async function POST(request: NextRequest) {
  const { error: authError } = await requireSuperAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { email, name, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['user', 'admin', 'super_admin'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if profile already exists (user already logged in before)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Check if trainee record already exists for this email
    const { data: existingTrainee } = await supabase
      .from('trainees')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingTrainee) {
      return NextResponse.json({ error: 'User already pre-registered' }, { status: 409 });
    }

    // Create trainee record with pre_assigned_role
    // When they log in via Google OAuth, the auth callback will pick up this role
    const { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .insert({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        access_token: crypto.randomUUID(),
        pre_assigned_role: role || 'user',
      })
      .select()
      .single();

    if (traineeError) {
      console.error('Error creating trainee:', traineeError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'User pre-registered. They will get the assigned role on first Google login.',
      trainee,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
