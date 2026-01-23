# PEP Training App - Product Status

## Overview
A web application for training PEP admissions team members through interactive content, knowledge checks, and AI-evaluated voice exercises.

**Live URL:** https://peptrainingapp.vercel.app

## Current Features

### Trainee Experience
- **Unique access links** - Each trainee gets a personalized training link
- **Section-based learning** - Content organized into modules with estimated completion times
- **Rich content blocks** - Text, callouts (info/warning/tip), quotes, and tables
- **Knowledge checks** - Multiple choice questions with immediate feedback
  - Re-attempts allowed with "Try again" button
  - Shows previous attempt count and correctness
- **Voice exercises** - Practice responding to realistic admissions scenarios
  - Audio recording with playback
  - AI transcription (OpenAI Whisper)
  - AI feedback and scoring (Claude)
  - Re-attempts allowed with full history
  - Previous attempts viewable with timestamps and scores
- **Progress tracking** - Visual progress through sections

### Manager Dashboard
- **Trainee management** - Create trainees and generate unique access links
- **Progress overview** - See completion status across all trainees
- **Detailed trainee view** - Drill into individual trainee performance
  - Section-by-section progress
  - All exercise attempts with timestamps
  - Question/scenario text displayed for context
  - AI feedback and scores for voice exercises
  - "Needs attention" flags for low scores

### Technical Stack
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (audio files)
- **AI:** OpenAI Whisper (transcription), Anthropic Claude (feedback)
- **Hosting:** Vercel

## Current Content

### Completed Training Sections (All 9 Modules)
1. **Welcome & Orientation** - What great admissions looks like
2. **The PEP Belief System** - Core beliefs that shape everything
3. **The Science** - Developmental research, motivation theory, Montessori evidence
4. **How the Program Works** - Daily structure, prepared environment, mixed-age classrooms
5. **Outcomes** - What we can/cannot promise, academic and non-academic outcomes
6. **The Admissions Conversation** - Structure, discovery questions, tailoring
7. **Objection Handling** - AEIO framework, common objections with responses
8. **Qualification** - Green/yellow/red flags, graceful decline techniques
9. **What You Must Never Say** - Hard rules, escalation paths

Each module includes:
- Educational content with callouts (info, warning, tip)
- 2-3 Multiple choice knowledge checks
- 1-2 Voice exercises with AI evaluation

## Data Retention Policy
- All exercise attempts stored indefinitely (text, feedback, scores)
- Audio files: 30-day availability (UI shows "Audio recording expired" for older files)

---

## Next Steps

### Potential Enhancements
- [ ] Add elementary-specific training modules
- [ ] Add middle school-specific training modules
- [ ] Implement scheduled cleanup of old audio files (30-day retention)
- [ ] Add progress analytics for managers
- [ ] Implement certification workflow after training completion

---

## Related Documents
- `ADMISSIONS_FORM_DESIGN.md` - Non-gameable admissions form with scenario questions and scoring guide

---

## Repository
https://github.com/rahul-raghavan/pep-training-app
