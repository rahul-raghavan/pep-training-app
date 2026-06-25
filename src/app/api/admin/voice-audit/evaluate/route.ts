import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_FEEDBACK_MODEL = process.env.CLAUDE_FEEDBACK_MODEL || 'claude-sonnet-4-6';

interface VoiceAuditProgramLink {
  title: string | null;
  slug: string | null;
}

interface VoiceAuditSectionLink {
  title: string | null;
  slug: string | null;
  programs: VoiceAuditProgramLink | VoiceAuditProgramLink[] | null;
}

interface VoiceAuditExercise {
  id: string;
  question: string | null;
  scenario: string | null;
  guidance: string | null;
  ai_prompt: string | null;
  program_sections: VoiceAuditSectionLink | VoiceAuditSectionLink[] | null;
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Voice audit is only available locally' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { exerciseId, transcription } = body as {
      exerciseId?: string;
      transcription?: string;
    };

    if (!exerciseId || !transcription?.trim()) {
      return NextResponse.json({ error: 'exerciseId and transcription are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: exercise, error } = await supabase
      .from('program_exercises')
      .select(`
        id,
        question,
        scenario,
        guidance,
        ai_prompt,
        program_sections (
          title,
          slug,
          programs (
            title,
            slug
          )
        )
      `)
      .eq('id', exerciseId)
      .eq('exercise_type', 'voice')
      .single();

    if (error || !exercise) {
      return NextResponse.json({ error: 'Voice assessment not found' }, { status: 404 });
    }

    const typedExercise = exercise as VoiceAuditExercise;
    const section = Array.isArray(typedExercise.program_sections)
      ? typedExercise.program_sections[0]
      : typedExercise.program_sections;
    const program: VoiceAuditProgramLink | null = section
      ? Array.isArray(section.programs)
        ? section.programs[0] || null
        : section.programs
      : null;

    const systemPrompt = `You are evaluating a teacher trainee's spoken answer to a PEP School training voice assessment.

Your job is to provide constructive, specific feedback that helps the trainee improve. Be encouraging but honest. Do not give vague praise. Evaluate against the scenario, guidance, and AI rubric supplied for this specific assessment.

Always provide:
1. A brief 2-3 sentence overall assessment
2. 1-2 specific things they did well, using short quotes or precise references from their response
3. 1-2 specific things to improve, with concrete suggestions
4. A score from 1-5 where:
   - 5 = Ready for real use
   - 4 = Strong, minor improvements needed
   - 3 = Good foundation, needs practice
   - 2 = Understanding there, delivery needs work
   - 1 = Needs to review the material

Format your response as:

**Overall:** [assessment]

**What you did well:**
- [specific strength]

**To improve:**
- [specific suggestion]

**Score: [X]/5**`;

    const userPrompt = `COURSE:
${program?.title || 'Unknown course'}

SECTION:
${section?.title || 'Unknown section'}

VOICE ASSESSMENT:
${typedExercise.question || 'Untitled'}

SCENARIO:
${typedExercise.scenario || ''}

WHAT A GOOD RESPONSE SHOULD INCLUDE:
${typedExercise.guidance || ''}

SPECIFIC AI RUBRIC:
${typedExercise.ai_prompt || ''}

TRAINEE'S RESPONSE:
"${transcription}"

Please evaluate this response.`;

    const response = await anthropic.messages.create({
      model: CLAUDE_FEEDBACK_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const feedbackText = response.content[0].type === 'text' ? response.content[0].text : '';
    const scoreMatch = feedbackText.match(/Score:\s*(\d)\/5/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 3;

    return NextResponse.json({
      feedback: feedbackText,
      score,
      exercise: {
        id: typedExercise.id,
        title: typedExercise.question,
        section: section?.title || null,
        program: program?.title || null,
      },
    });
  } catch (error) {
    console.error('Voice audit evaluation error:', {
      model: CLAUDE_FEEDBACK_MODEL,
      error,
    });
    return NextResponse.json({ error: 'Failed to evaluate response' }, { status: 500 });
  }
}
