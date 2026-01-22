import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST - Update progress for a section
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { traineeId, sectionId, status } = body;

    if (!traineeId || !sectionId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    const updateData: Record<string, string> = { status };

    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Update or insert progress
    const { data: existing } = await supabase
      .from('progress')
      .select('id')
      .eq('trainee_id', traineeId)
      .eq('section_id', sectionId)
      .single();

    if (existing) {
      await supabase
        .from('progress')
        .update(updateData)
        .eq('trainee_id', traineeId)
        .eq('section_id', sectionId);
    } else {
      await supabase.from('progress').insert({
        trainee_id: traineeId,
        section_id: sectionId,
        ...updateData,
      });
    }

    // Update trainee's last active timestamp
    await supabase
      .from('trainees')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', traineeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

// Store a response (for multiple choice, short answer)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { traineeId, sectionId, exerciseId, exerciseType, responseText, correct } = body;

    if (!traineeId || !sectionId || !exerciseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    await supabase.from('responses').insert({
      trainee_id: traineeId,
      section_id: sectionId,
      exercise_id: exerciseId,
      exercise_type: exerciseType,
      response_text: responseText,
      ai_score: correct ? 5 : 0, // For MC: 5 if correct, 0 if wrong
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing response:', error);
    return NextResponse.json({ error: 'Failed to store response' }, { status: 500 });
  }
}
