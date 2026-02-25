import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';

// GET - Fetch assessment attempts for current user's trainee
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  const traineeId = request.nextUrl.searchParams.get('traineeId');
  const programId = request.nextUrl.searchParams.get('programId');

  if (!traineeId || traineeId !== user.traineeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();

  let query = supabase
    .from('assessment_attempts')
    .select('*')
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: false });

  if (programId) {
    query = query.eq('program_id', programId);
  }

  const { data: attempts, error } = await query;

  if (error) {
    console.error('Error fetching attempts:', error);
    return NextResponse.json({ attempts: [] });
  }

  return NextResponse.json({ attempts: attempts || [] });
}

// POST - Save a new assessment attempt
export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { traineeId, score, total, answers, programId } = body;

    if (!traineeId || score === undefined || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (traineeId !== user.traineeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createAdminClient();

    const insertData: Record<string, unknown> = {
      trainee_id: traineeId,
      score,
      total,
      answers,
    };

    if (programId) {
      insertData.program_id = programId;
    }

    const { data, error } = await supabase
      .from('assessment_attempts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error saving attempt:', error);
      return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 });
    }

    // Update trainee's last active timestamp
    await supabase
      .from('trainees')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', traineeId);

    return NextResponse.json({ attempt: data });
  } catch (error) {
    console.error('Error in assessment POST:', error);
    return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 });
  }
}
