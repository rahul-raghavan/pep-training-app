# PEP Admissions Training App

A web application for training admissions team members through self-paced learning with voice-based practice exercises and AI feedback.

## Features

- **Trainee Flow**: Self-paced training with progress tracking
- **Voice Exercises**: Record responses, get AI transcription and feedback
- **Knowledge Checks**: Multiple choice questions with instant feedback
- **Manager Dashboard**: Monitor trainee progress, view summaries and scores
- **AI Feedback**: Claude evaluates voice responses with specific, actionable feedback

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (for audio files)
- **AI Feedback**: Claude API (Anthropic)
- **Transcription**: OpenAI Whisper API
- **Styling**: Tailwind CSS

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

### For Trainees

1. Open the unique link shared by your manager
2. Work through each section in order
3. Complete knowledge checks and voice exercises
4. Get instant AI feedback on voice responses
5. Continue until all sections are complete

## Adding More Content

To add more training sections, edit `src/content/sections.ts`. Each section has:

- `id`: Unique identifier
- `title`: Display name
- `estimatedMinutes`: Time estimate
- `content`: Array of content blocks (text, callouts, quotes, tables)
- `exercises`: Array of exercises (multiple_choice, voice)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in the Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set all environment variables in your Vercel project settings.

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── feedback/      # Claude API for AI feedback
│   │   ├── manager/       # Manager authentication and data
│   │   ├── progress/      # Progress tracking
│   │   ├── trainee/       # Trainee CRUD operations
│   │   └── transcribe/    # Whisper API for transcription
│   ├── manager/
│   │   ├── dashboard/     # Manager dashboard
│   │   └── trainee/[id]/  # Individual trainee view
│   └── train/[token]/
│       └── [section]/     # Training content pages
├── components/            # Reusable UI components
├── content/
│   ├── sections.ts        # Training content
│   └── types.ts           # TypeScript types
└── lib/
    └── supabase.ts        # Supabase client setup
```

## Current MVP Scope

This MVP includes:
- 2 training sections (Welcome & Belief System)
- Voice recording with transcription
- AI feedback on voice responses
- Progress tracking
- Manager dashboard

Future sections to add:
- The Science
- How the Program Works
- Outcomes
- The Admissions Conversation
- Objection Handling
- Qualification
- What You Must Never Say
# pep-training-app
# pep-training-app
