# PEP Admissions Training App — Technical Specification

## Overview
A web application for training admissions team members through self-paced learning with voice-based practice exercises and AI feedback.

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
  exercise_id TEXT NOT NULL, -- e.g., "kc-1", "practice-1"
  exercise_type TEXT NOT NULL, -- "multiple_choice", "short_answer", "voice"
  response_text TEXT, -- For text answers or transcriptions
  audio_url TEXT, -- For voice recordings (Supabase Storage URL)
  ai_feedback TEXT, -- Claude's feedback
  ai_score INTEGER, -- Optional 1-5 rating from AI
  created_at TIMESTAMP DEFAULT NOW()
);

-- Manager access (simple shared password)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- INSERT INTO settings (key, value) VALUES ('manager_password', 'your-password-here');
```

---

## URL Structure

| Route | Purpose |
|-------|---------|
| `/train/[token]` | Trainee's unique training link |
| `/train/[token]/[section]` | Specific section |
| `/manager` | Manager login |
| `/manager/dashboard` | Manager dashboard |
| `/manager/trainee/[id]` | Individual trainee detail |

---

## Page Components

### Trainee Flow

1. **Landing Page** (`/train/[token]`)
   - Welcome message
   - Progress overview (sections with status)
   - Continue button (to next incomplete section)

2. **Section Page** (`/train/[token]/[section]`)
   - Content blocks (markdown rendered)
   - Knowledge checks (inline, instant feedback)
   - Voice exercises (record, transcribe, get AI feedback)
   - Next section button (when all exercises complete)

3. **Completion Page**
   - Self-assessment checklist
   - Summary of performance
   - "Your manager will review your progress"

### Manager Flow

1. **Login** (`/manager`)
   - Simple password input
   - Sets cookie/session

2. **Dashboard** (`/manager/dashboard`)
   - List of all trainees
   - For each: name, progress %, last active, status indicator
   - "Generate New Link" button
   - Click trainee to see detail

3. **Trainee Detail** (`/manager/trainee/[id]`)
   - Section-by-section breakdown
   - AI feedback summaries per section
   - Flagged areas (low scores)
   - Option to listen to specific recordings if needed

---

## Content Structure

Content stored as TypeScript objects (not database) for easy editing:

```typescript
// content/sections.ts

export const sections = [
  {
    id: "welcome",
    title: "Welcome & Orientation",
    estimatedMinutes: 30,
    content: [...], // Array of content blocks
    exercises: [...] // Array of exercises
  },
  {
    id: "belief-system",
    title: "The PEP Belief System",
    estimatedMinutes: 45,
    content: [...],
    exercises: [...]
  }
  // ... more sections
];

// Content block types
type ContentBlock =
  | { type: "text", content: string } // Markdown
  | { type: "callout", variant: "info" | "warning" | "tip", content: string }
  | { type: "table", headers: string[], rows: string[][] }
  | { type: "quote", content: string, attribution?: string };

// Exercise types
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
      type: "short_answer",
      id: string,
      question: string,
      sampleAnswer: string // For self-check
    }
  | {
      type: "voice",
      id: string,
      scenario: string, // "A parent says..."
      guidance: string, // What a good answer includes
      aiPrompt: string  // Prompt for Claude to evaluate
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

## MVP Scope (First 2 Sections)

### Section 1: Welcome & Orientation
- Why admissions matters at PEP
- What great admissions looks like
- How to use this training
- **Exercise:** Multiple choice on admissions role

### Section 2: The PEP Belief System
- Founding story
- Core belief: children want to learn
- The enemy: traditional schooling's lie
- The promise: rigour with joy
- **Exercises:**
  - Multiple choice on core belief
  - Voice: "Explain PEP's founding story in your own words"
  - Voice: "A parent asks what makes PEP different from other schools"

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (Whisper)
OPENAI_API_KEY=

# Anthropic (Claude)
ANTHROPIC_API_KEY=

# Manager password (or store in DB)
MANAGER_PASSWORD=
```

---

## File Structure

```
pep-training-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx (redirect to /manager or landing)
│   ├── train/
│   │   └── [token]/
│   │       ├── page.tsx (trainee home)
│   │       └── [section]/
│   │           └── page.tsx (section content)
│   ├── manager/
│   │   ├── page.tsx (login)
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── trainee/
│   │       └── [id]/
│   │           └── page.tsx
│   └── api/
│       ├── transcribe/
│       │   └── route.ts (Whisper API)
│       ├── feedback/
│       │   └── route.ts (Claude API)
│       ├── trainee/
│       │   └── route.ts (CRUD)
│       └── progress/
│           └── route.ts (update progress)
├── components/
│   ├── ContentBlock.tsx
│   ├── MultipleChoice.tsx
│   ├── ShortAnswer.tsx
│   ├── VoiceRecorder.tsx
│   ├── ProgressBar.tsx
│   └── ...
├── content/
│   ├── sections.ts (all content)
│   └── types.ts
├── lib/
│   ├── supabase.ts
│   ├── whisper.ts
│   └── claude.ts
└── ...
```

---

## Next Steps

1. Initialize Next.js project
2. Set up Supabase project and tables
3. Build core components (ContentBlock, VoiceRecorder)
4. Implement trainee flow for Section 1 & 2
5. Implement API routes for transcription and feedback
6. Build manager dashboard
7. Test end-to-end
8. Deploy to Vercel
