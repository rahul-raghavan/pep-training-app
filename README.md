# PEP Admissions Training App

A web application for training admissions team members through self-paced learning with voice-based practice exercises, AI feedback, and a comprehensive final assessment.

## Features

- **9 Training Modules** - Complete curriculum covering all aspects of PEP admissions
- **Voice Exercises** - Record responses, get AI transcription and personalized feedback
- **Knowledge Checks** - 27 multiple choice questions with instant feedback and re-attempts
- **Final Assessment** - 15-question comprehensive assessment with detailed results report
- **Manager Dashboard** - Monitor trainee progress, view all responses and scores
- **Content Preview** - Managers can view all training content without locks
- **AI Feedback** - Claude evaluates voice responses with specific, actionable feedback

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (for audio files)
- **AI Feedback**: Claude API (Anthropic)
- **Transcription**: OpenAI Whisper API
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

## Training Content

1. Welcome & Orientation
2. The PEP Belief System
3. The Science
4. How the Program Works
5. Outcomes
6. The Admissions Conversation
7. Objection Handling
8. Qualification
9. What You Must Never Say

Plus a 15-question final assessment covering all modules.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings > API** and copy:
   - Project URL
   - anon/public key
   - service_role key (keep this secret!)

### 2. Set Up the Database

1. In Supabase, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql` and run it
3. Go to **Storage** and create a new bucket called `audio` with public access

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (for Whisper transcription)
OPENAI_API_KEY=your-openai-key

# Anthropic (for Claude feedback)
ANTHROPIC_API_KEY=your-anthropic-key

# Manager password
MANAGER_PASSWORD=choose-a-secure-password
```

### 4. Install Dependencies and Run

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## Usage

### For Managers

1. Go to `/manager` and log in with your password
2. Click "New Trainee Link" to create a training link
3. Share the link with the trainee
4. Monitor progress on the dashboard
5. Click on a trainee to see detailed responses and feedback
6. Use `/manager/content` to preview all training content

### For Trainees

1. Open the unique link shared by your manager
2. Work through each section in order
3. Complete knowledge checks and voice exercises
4. Get instant AI feedback on voice responses
5. Complete the final assessment after finishing all modules

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── assessment/       # Final assessment API
│   │   ├── feedback/         # Claude API for AI feedback
│   │   ├── manager/          # Manager authentication and data
│   │   ├── progress/         # Progress tracking
│   │   ├── trainee/          # Trainee CRUD operations
│   │   └── transcribe/       # Whisper API for transcription
│   ├── manager/
│   │   ├── content/          # Content preview for managers
│   │   ├── dashboard/        # Manager dashboard
│   │   └── trainee/[id]/     # Individual trainee view
│   └── train/[token]/
│       ├── assessment/       # Final assessment page
│       └── [section]/        # Training content pages
├── components/               # Reusable UI components
├── content/
│   ├── assessment.ts         # Final assessment questions
│   ├── sections.ts           # Training content
│   └── types.ts              # TypeScript types
└── lib/
    └── supabase.ts           # Supabase client setup
```

## Database Tables

- **trainees** - Trainee info and unique access tokens
- **progress** - Section completion status per trainee
- **responses** - All exercise attempts (MC and voice)
- **assessment_attempts** - Final assessment attempts

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in the Vercel dashboard
4. Deploy!

## Documentation

- `PRODUCT_STATUS.md` - Current features and recent updates
- `TECHNICAL_SPEC.md` - Technical architecture details
- `ADMISSIONS_FORM_DESIGN.md` - Related admissions form design

## Repository

https://github.com/rahul-raghavan/pep-training-app
