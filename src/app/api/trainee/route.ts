import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { sections } from '@/content/sections';

// GET - Fetch trainee by token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: trainee, error } = await supabase
    .from('trainees')
    .select('*')
    .eq('access_token', token)
    .single();

  if (error || !trainee) {
    return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
  }

  // Update last active timestamp
  await supabase
    .from('trainees')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', trainee.id);

  // Fetch progress
  const { data: progress } = await supabase
    .from('progress')
    .select('*')
    .eq('trainee_id', trainee.id);

  // Fetch responses
  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('trainee_id', trainee.id);

  return NextResponse.json({
    trainee,
    progress: progress || [],
    responses: responses || [],
  });
}

// POST - Create new trainee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const accessToken = uuidv4();

    // Create trainee
    const { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .insert({
        name,
        email,
        access_token: accessToken,
      })
      .select()
      .single();

    if (traineeError) {
      console.error('Error creating trainee:', traineeError);
      return NextResponse.json({ error: 'Failed to create trainee' }, { status: 500 });
    }

    // Initialize progress for all sections
    const progressRows = sections.map(section => ({
      trainee_id: trainee.id,
      section_id: section.id,
      status: 'not_started',
    }));

    await supabase.from('progress').insert(progressRows);

    return NextResponse.json({
      trainee,
      accessUrl: `/train/${accessToken}`,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create trainee' }, { status: 500 });
  }
}
