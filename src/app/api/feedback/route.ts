import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { traineeId, sectionId, exerciseId, scenario, guidance, aiPrompt, transcription, audioUrl } = body;

    if (!transcription) {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
    }

    // Build the prompt for Claude
    const systemPrompt = `You are evaluating a trainee's response to an admissions scenario for PEP School, an innovative school that believes children naturally want to learn and delivers "rigour with joy."

Your job is to provide constructive, specific feedback that helps the trainee improve. Be encouraging but honest—vague praise doesn't help anyone learn.

Always provide:
1. A brief (2-3 sentence) overall assessment
2. 1-2 specific things they did well (with quotes from their response)
3. 1-2 specific things to improve (with concrete suggestions)
4. A score from 1-5 where:
   - 5 = Ready for real conversations
   - 4 = Strong, minor improvements needed
   - 3 = Good foundation, needs practice
   - 2 = Understanding there, delivery needs work
   - 1 = Needs to review the material

Format your response as:

**Overall:** [assessment]

**What you did well:**
- [specific strength with example]

**To improve:**
- [specific suggestion]

**Score: [X]/5**`;

    const userPrompt = `SCENARIO:
"${scenario}"

WHAT A GOOD RESPONSE SHOULD INCLUDE:
${guidance}

SPECIFIC EVALUATION CRITERIA:
${aiPrompt}

TRAINEE'S RESPONSE:
"${transcription}"

Please evaluate this response.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract the text response
    const feedbackText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract score from the response (look for "Score: X/5")
    const scoreMatch = feedbackText.match(/Score:\s*(\d)\/5/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 3;

    // Store the response in the database
    const supabase = createServerClient();

    const { error: dbError } = await supabase.from('responses').insert({
      trainee_id: traineeId,
      section_id: sectionId,
      exercise_id: exerciseId,
      exercise_type: 'voice',
      response_text: transcription,
      audio_url: audioUrl,
      ai_feedback: feedbackText,
      ai_score: score,
    });

    if (dbError) {
      console.error('Database error:', dbError);
      // Continue anyway - feedback was generated
    }

    return NextResponse.json({
      feedback: feedbackText,
      score,
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Failed to get feedback' }, { status: 500 });
  }
}
