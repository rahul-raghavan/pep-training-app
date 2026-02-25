import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DEV ONLY — this endpoint does not exist in production
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { email, name, role } = await request.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Service role client for admin operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Step 1: Create or find the auth user
  let userId: string;
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createError || !newUser.user) {
      return NextResponse.json({ error: 'Failed to create user', details: createError?.message }, { status: 500 });
    }
    userId = newUser.user.id;
  }

  // Step 2: Generate magic link
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError || !linkData) {
    return NextResponse.json({ error: 'Failed to generate link', details: linkError?.message }, { status: 500 });
  }

  // Step 3: Exchange for session using a PLAIN (non-SSR) client
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: sessionData, error: otpError } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (otpError || !sessionData.session) {
    return NextResponse.json({ error: 'Failed to verify OTP', details: otpError?.message }, { status: 500 });
  }

  // Step 4: Ensure profile record exists with the right role
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (!existingProfile) {
    await adminClient.from('profiles').insert({
      id: userId,
      email,
      name: name || email.split('@')[0],
      role: role || 'user',
      is_active: true,
    });
  } else {
    // Update role if it changed
    await adminClient
      .from('profiles')
      .update({ role: role || 'user', is_active: true })
      .eq('id', userId);
  }

  // Step 5: Ensure trainee record exists and is linked
  const { data: existingTrainee } = await adminClient
    .from('trainees')
    .select('id')
    .eq('email', email)
    .single();

  if (!existingTrainee) {
    await adminClient.from('trainees').insert({
      name: name || email.split('@')[0],
      email,
      access_token: crypto.randomUUID(),
      user_id: userId,
    });
  } else {
    // Link auth user if not already linked
    await adminClient
      .from('trainees')
      .update({ user_id: userId })
      .eq('email', email)
      .is('user_id', null);
  }

  // Step 6: Set session cookies
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const sessionStr = JSON.stringify(sessionData.session);

  const response = NextResponse.json({ success: true, userId });

  const CHUNK_SIZE = 3180;
  if (sessionStr.length <= CHUNK_SIZE) {
    response.cookies.set(cookieName, sessionStr, {
      path: '/',
      httpOnly: false,
      secure: false, // MUST be false for HTTP localhost
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });
  } else {
    // Chunk the cookie like Supabase SSR does
    const chunks = Math.ceil(sessionStr.length / CHUNK_SIZE);
    for (let i = 0; i < chunks; i++) {
      response.cookies.set(`${cookieName}.${i}`, sessionStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), {
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      });
    }
  }

  return response;
}
