import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { getProgram, getProgramIdForSection, isTraineeEnrolled } from '@/lib/programs';
import { getProgramAccessStatus, prerequisiteLockedResponse } from '@/lib/program-prerequisites';

// Allow up to 60 seconds for AI feedback generation
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_FEEDBACK_MODEL = process.env.CLAUDE_FEEDBACK_MODEL || 'claude-sonnet-4-6';

const PRIVATE_ADMIN_SCORE_INSTRUCTION = `Do not include any numeric score in the teacher-facing feedback. After the teacher-facing feedback, add a final separate line exactly: Admin Score: X/5. This private administrator score should consider truth accuracy, connection thread, the target craft skill, and natural classroom voice. Use 1 = not yet usable, 2 = emerging, 3 = accurate foundation, 4 = strong, 5 = classroom-ready Montessori telling.`;

function splitEmbeddedSystemPrompt(aiPrompt: unknown): {
  aiPrompt: string;
  systemPrompt?: string;
} {
  if (typeof aiPrompt !== 'string') return { aiPrompt: '' };
  const match = aiPrompt.match(
    /^\[\[SYSTEM_PROMPT\]\]\n([\s\S]*?)\n\[\[\/SYSTEM_PROMPT\]\]\n\n?([\s\S]*)$/
  );
  if (!match) return { aiPrompt };
  return {
    systemPrompt: match[1].trim(),
    aiPrompt: match[2].trim(),
  };
}

function shouldPrivatelyScoreCustomPrompt(systemPrompt: string): boolean {
  const trimmed = systemPrompt.trim();
  return !(
    /^This is a re-tell/i.test(trimmed) ||
    /^This is a micro voice move/i.test(trimmed) ||
    /^This recording supports a self-listening/i.test(trimmed)
  );
}

function withPrivateAdminScore(systemPrompt: string): string {
  const teacherFacingPrompt = systemPrompt
    .replace(/\bNever give a numeric score\.\s*/gi, '')
    .replace(/\bDo not give a numeric score\.\s*/gi, '')
    .replace(/\bDo not give a score\.\s*/gi, '')
    .replace(/\bDo not score\.\s*/gi, '')
    .trim();

  return `${teacherFacingPrompt} ${PRIVATE_ADMIN_SCORE_INSTRUCTION}`;
}

function extractScore(feedbackText: string): number | null {
  const scoreMatch = feedbackText.match(/(?:Admin\s*)?Score:\s*([1-5])\/5/i);
  return scoreMatch ? parseInt(scoreMatch[1], 10) : null;
}

function stripPrivateScoreLine(feedbackText: string): string {
  return feedbackText
    .split('\n')
    .filter(line => !/^\s*(?:\*\*)?(?:Admin\s*)?Score:\s*[1-5]\/5(?:\*\*)?[\s.]*$/i.test(line.trim()))
    .join('\n')
    .trim();
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { traineeId, sectionId, exerciseId, scenario, guidance, aiPrompt, systemPrompt: customSystemPrompt, transcription, audioUrl } = body;

    if (!transcription) {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
    }

    if (traineeId !== user.traineeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const programId = await getProgramIdForSection(sectionId);
    if (programId) {
      if (!(await isTraineeEnrolled(traineeId, programId))) {
        return NextResponse.json({ error: 'Not enrolled in this program' }, { status: 403 });
      }
      const program = await getProgram(programId);
      if (program) {
        const accessStatus = await getProgramAccessStatus(traineeId, program);
        if (accessStatus.locked) {
          return NextResponse.json(prerequisiteLockedResponse(accessStatus), { status: 423 });
        }
      }
    }

    // Build the prompt for Claude
    const defaultSystemPrompt = `You are evaluating a trainee's response to an admissions scenario for PEP School, an innovative school that believes children naturally want to learn and delivers "rigour with joy."

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
    const embeddedPrompt = splitEmbeddedSystemPrompt(aiPrompt);
    const effectiveCustomSystemPrompt = typeof customSystemPrompt === 'string' && customSystemPrompt.trim().length > 0
      ? customSystemPrompt
      : embeddedPrompt.systemPrompt;
    const effectiveAiPrompt = embeddedPrompt.aiPrompt;
    const customSystemPromptText = typeof effectiveCustomSystemPrompt === 'string'
      ? effectiveCustomSystemPrompt.trim()
      : '';
    const hasCustomSystemPrompt = customSystemPromptText.length > 0;
    const privateAdminScore = hasCustomSystemPrompt && shouldPrivatelyScoreCustomPrompt(customSystemPromptText);
    const systemPrompt = hasCustomSystemPrompt
      ? privateAdminScore
        ? withPrivateAdminScore(customSystemPromptText)
        : customSystemPromptText
      : defaultSystemPrompt;

    const userPrompt = `SCENARIO:
"${scenario}"

WHAT A GOOD RESPONSE SHOULD INCLUDE:
${guidance}

SPECIFIC EVALUATION CRITERIA:
${effectiveAiPrompt}

TRAINEE'S RESPONSE:
"${transcription}"

Please evaluate this response.`;

    const response = await anthropic.messages.create({
      model: CLAUDE_FEEDBACK_MODEL,
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

    const parsedScore = extractScore(feedbackText);
    const score = parsedScore ?? (hasCustomSystemPrompt ? null : 3);
    const storedFeedbackText = hasCustomSystemPrompt
      ? stripPrivateScoreLine(feedbackText)
      : feedbackText;

    // Store the response in the database
    const supabase = createAdminClient();

    const { error: dbError } = await supabase.from('responses').insert({
      trainee_id: traineeId,
      section_id: sectionId,
      exercise_id: exerciseId,
      exercise_type: 'voice',
      response_text: transcription,
      audio_url: audioUrl,
      ai_feedback: storedFeedbackText,
      ai_score: score,
    });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return NextResponse.json({
      feedback: storedFeedbackText,
      score: hasCustomSystemPrompt ? null : score,
    });
  } catch (error) {
    console.error('Feedback error:', {
      model: CLAUDE_FEEDBACK_MODEL,
      error,
    });
    return NextResponse.json({ error: 'Failed to get feedback' }, { status: 500 });
  }
}
