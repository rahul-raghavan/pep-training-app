import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sections } from '@/content/sections';

// POST - Verify manager password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    const managerPassword = process.env.MANAGER_PASSWORD;

    if (!managerPassword) {
      return NextResponse.json({ error: 'Manager password not configured' }, { status: 500 });
    }

    if (password !== managerPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create a simple session token (in production, use proper session management)
    const sessionToken = Buffer.from(`manager:${Date.now()}`).toString('base64');

    const response = NextResponse.json({ success: true });
    response.cookies.set('manager_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

// GET - Fetch all trainees with their progress
export async function GET(request: NextRequest) {
  // Check for manager session
  const session = request.cookies.get('manager_session');
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch all trainees
  const { data: trainees, error: traineeError } = await supabase
    .from('trainees')
    .select('*')
    .order('created_at', { ascending: false });

  if (traineeError) {
    return NextResponse.json({ error: 'Failed to fetch trainees' }, { status: 500 });
  }

  // Fetch all progress
  const { data: progress } = await supabase.from('progress').select('*');

  // Fetch all responses for summary
  const { data: responses } = await supabase.from('responses').select('*');

  // Calculate summary for each trainee
  const traineeSummaries = trainees?.map(trainee => {
    const traineeProgress = progress?.filter(p => p.trainee_id === trainee.id) || [];
    const traineeResponses = responses?.filter(r => r.trainee_id === trainee.id) || [];

    const completedSections = traineeProgress.filter(p => p.status === 'completed').length;
    const totalSections = sections.length;
    const progressPercent = Math.round((completedSections / totalSections) * 100);

    // Calculate average score from voice exercises
    const voiceResponses = traineeResponses.filter(r => r.exercise_type === 'voice' && r.ai_score);
    const avgScore = voiceResponses.length > 0
      ? Math.round(voiceResponses.reduce((sum, r) => sum + (r.ai_score || 0), 0) / voiceResponses.length * 10) / 10
      : null;

    // Determine status
    let status = 'not_started';
    if (completedSections === totalSections) {
      status = 'completed';
    } else if (completedSections > 0 || traineeProgress.some(p => p.status === 'in_progress')) {
      status = 'in_progress';
    }

    return {
      ...trainee,
      completedSections,
      totalSections,
      progressPercent,
      avgScore,
      status,
      exerciseCount: traineeResponses.length,
    };
  });

  return NextResponse.json({ trainees: traineeSummaries });
}
