# PEP Admissions Training App - Technical Specification

## Overview
A web application for training admissions team members through self-paced learning with voice-based practice exercises, AI feedback, and comprehensive assessment.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (for audio files)
- **Auth:** None for trainees (unique links), simple password for manager
- **AI Feedback:** Claude API (Anthropic)
- **Transcription:** OpenAI Whisper API
- **Hosting:** Vercel
- **Styling:** Tailwind CSS

---

## Database Schema

### Tables

```sql
-- Trainees (created when manager generates a link)
CREATE TABLE trainees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  access_token TEXT UNIQUE NOT NULL, -- Used in unique URL
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP
);

-- Progress tracking per section
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL, -- e.g., "welcome", "belief-system"
  status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(trainee_id, section_id)
);

-- Individual responses (knowledge checks + voice exercises)
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL, -- e.g., "belief-mc-1", "belief-voice-1"
  exercise_type TEXT NOT NULL, -- "multiple_choice", "voice"
  response_text TEXT, -- For text answers or transcriptions
  audio_url TEXT, -- For voice recordings (Supabase Storage URL)
  ai_feedback TEXT, -- Claude's feedback
  ai_score INTEGER, -- 1-5 rating from AI (voice) or 0/5 (MC correct/incorrect)
  correct BOOLEAN, -- For multiple choice: was it correct?
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assessment attempts (final assessment)
CREATE TABLE assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  answers JSONB, -- Record of question_id -> selected_index
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## URL Structure

| Route | Purpose |
|-------|---------|
| `/train/[token]` | Trainee's unique training link (dashboard) |
| `/train/[token]/[section]` | Specific section content |
| `/train/[token]/assessment` | Final assessment |
| `/manager` | Manager login |
| `/manager/dashboard` | Manager dashboard |
| `/manager/content` | Content preview (all modules + assessment) |
| `/manager/trainee/[id]` | Individual trainee detail |

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/trainee` | GET | Fetch trainee by token |
| `/api/trainee` | POST | Create new trainee |
| `/api/progress` | POST | Update section status |
| `/api/progress` | PUT | Save exercise response |
| `/api/transcribe` | POST | Whisper transcription |
| `/api/feedback` | POST | Claude feedback for voice |
| `/api/assessment` | GET | Fetch assessment attempts |
| `/api/assessment` | POST | Save assessment attempt |
| `/api/manager` | POST | Manager login |
| `/api/manager/trainee/[id]` | GET | Fetch trainee details |

---

## Content Structure

Content stored as TypeScript objects in `src/content/`:

### sections.ts
```typescript
export const sections = [
  {
    id: "welcome",
    title: "Welcome & Orientation",
    estimatedMinutes: 30,
    content: ContentBlock[], // Text, callouts, quotes, tables
    exercises: Exercise[]   // Multiple choice and voice
  },
  // ... 9 total sections
];
```

### assessment.ts
```typescript
export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: string,
    question: string,
    options: string[],
    correctIndex: number,
    explanation: string,
    module: string
  },
  // ... 15 questions
];

export const PASSING_SCORE = 12; // 80%
```

### Content Block Types
```typescript
type ContentBlock =
  | { type: "text", content: string } // Markdown
  | { type: "callout", variant: "info" | "warning" | "tip", content: string }
  | { type: "table", headers: string[], rows: string[][] }
  | { type: "quote", content: string, attribution?: string };
```

### Exercise Types
```typescript
type Exercise =
  | {
      type: "multiple_choice",
      id: string,
      question: string,
      options: string[],
      correctIndex: number,
      explanation: string
    }
  | {
      type: "voice",
      id: string,
      scenario: string,   // "A parent says..."
      guidance: string,   // What a good answer includes
      aiPrompt: string    // Prompt for Claude to evaluate
    };
```

---

## Voice Recording Flow

1. User clicks "Start Recording"
2. Browser MediaRecorder API captures audio (webm format)
3. User clicks "Stop Recording"
4. Audio uploaded to Supabase Storage
5. Audio sent to Whisper API for transcription
6. Transcription + exercise context sent to Claude for feedback
7. Feedback displayed to user
8. All saved to `responses` table
9. User can re-attempt (new row in responses)

---

## AI Feedback Prompt Template

```
You are evaluating a trainee's response to an admissions scenario for PEP School.

SCENARIO:
{scenario}

GOOD RESPONSE SHOULD INCLUDE:
{guidance}

TRAINEE'S RESPONSE (transcribed):
{transcription}

Evaluate the response on these criteria:
1. Key points covered (what did they include/miss?)
2. Tone and approach (warm, confident, not pushy?)
3. Accuracy (any incorrect information?)

Provide:
- A brief (2-3 sentence) overall assessment
- 1-2 specific things they did well
- 1-2 specific things to improve
- A score from 1-5 (5 = ready for real conversations)

Keep feedback encouraging but honest. Be specific, not generic.
```

---

## File Structure

```
pep-training-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── train/
│   │   │   └── [token]/
│   │   │       ├── page.tsx           # Trainee dashboard
│   │   │       ├── assessment/
│   │   │       │   └── page.tsx       # Final assessment
│   │   │       └── [section]/
│   │   │           └── page.tsx       # Section content
│   │   ├── manager/
│   │   │   ├── page.tsx               # Login
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx           # Dashboard
│   │   │   ├── content/
│   │   │   │   └── page.tsx           # Content preview
│   │   │   └── trainee/
│   │   │       └── [id]/
│   │   │           └── page.tsx       # Trainee detail
│   │   └── api/
│   │       ├── transcribe/route.ts
│   │       ├── feedback/route.ts
│   │       ├── trainee/route.ts
│   │       ├── progress/route.ts
│   │       ├── assessment/route.ts
│   │       └── manager/
│   │           ├── route.ts
│   │           └── trainee/[id]/route.ts
│   ├── components/
│   │   ├── ContentBlock.tsx
│   │   ├── MultipleChoice.tsx
│   │   ├── VoiceRecorder.tsx
│   │   ├── ProgressBar.tsx
│   │   └── FeedbackDisplay.tsx
│   ├── content/
│   │   ├── sections.ts
│   │   ├── assessment.ts
│   │   └── types.ts
│   └── lib/
│       └── supabase.ts
├── supabase-schema.sql
├── migration-add-assessment-attempts.sql
└── ...
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (Whisper)
OPENAI_API_KEY=

# Anthropic (Claude)
ANTHROPIC_API_KEY=

# Manager password
MANAGER_PASSWORD=
```

---

## Key Implementation Details

### Multiple Choice Tracking
- Each attempt creates a new row in `responses`
- `correct` field stores true/false
- `ai_score` stores 5 (correct) or 0 (incorrect)
- UI shows attempt count and correct count
- Manager view shows "Correct" or "Incorrect" badge per attempt

### Final Assessment
- Stored in `assessment_attempts` table
- `answers` JSONB stores `{ questionId: selectedIndex }`
- Score and total tracked
- Passing score: 12/15 (80%)
- Retakeable - each attempt is a new row

### Manager Trainee View
- Shows ALL exercises (not just those with responses)
- Groups attempts by exercise
- Shows "No attempts yet" for unanswered exercises
- Displays correct/incorrect for MC, score/5 for voice
