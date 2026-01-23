import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET - Fetch assessment attempts for a trainee
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const traineeId = searchParams.get('traineeId');

  if (!traineeId) {
    return NextResponse.json({ error: 'Missing traineeId' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: attempts, error } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching attempts:', error);
    return NextResponse.json({ attempts: [] });
  }

  return NextResponse.json({ attempts: attempts || [] });
}

// POST - Save a new assessment attempt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { traineeId, score, total, answers } = body;

    if (!traineeId || score === undefined || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('assessment_attempts')
      .insert({
        trainee_id: traineeId,
        score,
        total,
        answers,
      })
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
