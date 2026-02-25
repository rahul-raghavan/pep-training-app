import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_DOMAINS = ['pepschoolv2.com', 'accelschool.in', 'ribbons.education'];
const SUPER_ADMIN_EMAILS = [
  'rahul@pepschoolv2.com',
  'chetan@pepschoolv2.com',
  'founders.office@pepschoolv2.com',
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Exchange the code for a session
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData.user) {
    console.error('Auth callback error:', sessionError);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = sessionData.user;
  const email = user.email?.toLowerCase();

  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=no_email`);
  }

  // Check domain
  const domain = email.split('@')[1];
  if (!ALLOWED_DOMAINS.includes(domain)) {
    // Sign them out since they're not allowed
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`);
  }

  // Use admin client for DB operations (bypasses RLS)
  const admin = createAdminClient();

  // Check if profile already exists
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  let role: string;

  if (existingProfile) {
    // Existing user — check if active
    if (!existingProfile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=account_deactivated`);
    }
    role = existingProfile.role;
  } else {
    // First login — create profile
    const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];

    // Determine role: hardcoded super_admins first, then check pre_assigned_role, else default to 'user'
    if (SUPER_ADMIN_EMAILS.includes(email)) {
      role = 'super_admin';
    } else {
      // Check if a super_admin pre-registered this user with a specific role
      const { data: preRegistered } = await admin
        .from('trainees')
        .select('id, pre_assigned_role')
        .eq('email', email)
        .not('pre_assigned_role', 'is', null)
        .single();

      if (preRegistered?.pre_assigned_role) {
        role = preRegistered.pre_assigned_role;
        // Clear pre_assigned_role — it's a one-time use
        await admin
          .from('trainees')
          .update({ pre_assigned_role: null })
          .eq('id', preRegistered.id);
      } else {
        role = 'user';
      }
    }

    const { error: profileError } = await admin.from('profiles').insert({
      id: user.id,
      email,
      name,
      role,
    });

    if (profileError) {
      console.error('Failed to create profile:', profileError);
      return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`);
    }

    // Link to existing trainee by email, or create a new one
    const { data: existingTrainee } = await admin
      .from('trainees')
      .select('id')
      .eq('email', email)
      .is('user_id', null)
      .single();

    if (existingTrainee) {
      // Link existing trainee record to this auth user
      await admin
        .from('trainees')
        .update({ user_id: user.id })
        .eq('id', existingTrainee.id);
    } else {
      // Create a new trainee record linked to this auth user
      await admin.from('trainees').insert({
        name,
        email,
        access_token: uuidv4(),
        user_id: user.id,
      });
    }
  }

  // Redirect based on role
  if (role === 'super_admin' || role === 'admin') {
    return NextResponse.redirect(`${origin}/admin/dashboard`);
  }
  return NextResponse.redirect(`${origin}/learn`);
}
