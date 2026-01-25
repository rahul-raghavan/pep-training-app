# PEP Training App - Product Status

## Overview
A web application for training PEP admissions team members through interactive content, knowledge checks, AI-evaluated voice exercises, and a comprehensive final assessment.

**Live URL:** https://peptrainingapp.vercel.app

## Current Features

### Trainee Experience
- **Unique access links** - Each trainee gets a personalized training link
- **Section-based learning** - 9 modules with estimated completion times
- **Rich content blocks** - Text, callouts (info/warning/tip), quotes, and tables
- **Knowledge checks** - Multiple choice questions with immediate feedback
  - 2-4 questions per module (27 total across all modules)
  - Re-attempts allowed with "Try again" button
  - Shows previous attempt count and correctness
  - Questions designed to be challenging (similar-length options, no obvious answers)
- **Voice exercises** - Practice responding to realistic admissions scenarios
  - Audio recording with playback
  - AI transcription (OpenAI Whisper)
  - AI feedback and scoring (Claude)
  - Re-attempts allowed with full history
  - Previous attempts viewable with timestamps and scores
- **Progress tracking** - Visual progress through sections, sections unlock sequentially
- **Final Assessment** - Comprehensive 15-question assessment covering all modules
  - Unlocks after completing all training modules
  - All questions answered in one sitting
  - Full results report with explanations
  - Retakeable (starts fresh each time)
  - Passing score: 12/15 (80%)

### Manager Dashboard
- **Trainee management** - Create trainees and generate unique access links
- **Progress overview** - See completion status across all trainees
- **Content preview** - View all training content and exercises (including final assessment) without locks
- **Detailed trainee view** - Drill into individual trainee performance
  - Section-by-section progress
  - All exercises shown (with attempts or "No attempts yet")
  - Question/scenario text displayed for context
  - Correct/Incorrect badges for multiple choice
  - AI feedback and scores for voice exercises
  - "Needs attention" flags for low scores
  - Assessment attempts with pass/fail status

### Technical Stack
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (audio files)
- **AI:** OpenAI Whisper (transcription), Anthropic Claude (feedback)
- **Hosting:** Vercel

## Current Content

### Training Modules (All 9 Complete)
1. **Welcome & Orientation** - What great admissions looks like (3 MC, 1 voice)
2. **The PEP Belief System** - Core beliefs, PEP = Personalized Education Paths (4 MC, 1 voice)
3. **The Science** - Brain development, sensitive periods, Montessori phonics approach (3 MC, 1 voice)
4. **How the Program Works** - Three-hour work cycle, mixed-age classrooms, daily structure (3 MC, 1 voice)
5. **Outcomes** - Academic outcomes (reading/writing/math), what we can/cannot promise (3 MC, 1 voice)
6. **The Admissions Conversation** - Discovery questions, tour guidelines, closing/next steps process (3 MC, 1 voice)
7. **Objection Handling** - AEIO framework, common objections including physical activity concerns (3 MC, 1 voice)
8. **Qualification** - Green/yellow/red flags, graceful decline techniques (3 MC, 1 voice)
9. **What You Must Never Say** - Hard rules, escalation paths (3 MC, 1 voice)

### Final Assessment
- 15 comprehensive questions covering all 9 modules
- Questions mirror the improved MC format (concise, challenging options)
- Full explanations shown in results report

## Key Content Details

### PEP Approach Highlights (from content)
- **PEP** = Personalized Education Paths (plural)
- **Primary level** = One-on-one attention; older children = small groups
- **Three-hour work cycle** = Sacred, uninterrupted morning work period
- **Snack** = Brought from home, eaten during work cycle at child's pace
- **Community lunch** = Children eat together after morning cycle
- **Afternoon** = Second work cycle, local languages, field trips (for full-day students)
- **Academic outcomes** = Most children read/write fluently by preschool exit; work with 4-digit numbers conceptually
- **Admissions next steps** = Reading material + questionnaire; child visit for ages 3+

## Data Retention Policy
- All exercise attempts stored indefinitely (text, feedback, scores)
- Audio files: 30-day availability (UI shows "Audio recording expired" for older files)

---

## Database Tables

1. **trainees** - Trainee info and access tokens
2. **progress** - Section completion status per trainee
3. **responses** - All exercise attempts (MC and voice)
4. **assessment_attempts** - Final assessment attempts with scores and answers

---

## Recent Updates

### January 2025
- Added final assessment (15 questions, comprehensive report)
- Improved all MC questions (concise options, more challenging)
- Added new MC questions to each module (27 total)
- Updated content based on feedback:
  - PEP acronym corrected to "Personalized Education Paths"
  - One-on-one for primary level emphasized
  - Montessori phonics approach (early reading is a strength)
  - Three-hour work cycle as central feature
  - Stronger academic outcomes language
  - Physical activity objection handling added
  - Complete admissions next steps process
- Fixed MC attempt tracking (all attempts now display correctly)
- Manager view shows all exercises including unanswered ones

---

## Potential Enhancements
- [ ] Add elementary-specific training modules
- [ ] Add middle school-specific training modules
- [ ] Implement scheduled cleanup of old audio files (30-day retention)
- [ ] Add progress analytics for managers
- [ ] Implement certification workflow after training completion

---

## Related Documents
- `ADMISSIONS_FORM_DESIGN.md` - Non-gameable admissions form with scenario questions and scoring guide
- `TECHNICAL_SPEC.md` - Technical architecture and database schema
- `README.md` - Setup and deployment instructions

---

## Repository
https://github.com/rahul-raghavan/pep-training-app
