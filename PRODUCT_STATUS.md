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

### Completed Training Sections
1. **Welcome & Orientation** - What great admissions looks like
2. **The PEP Belief System** - Core beliefs that shape everything

## Data Retention Policy
- All exercise attempts stored indefinitely (text, feedback, scores)
- Audio files: 30-day availability (UI shows "Audio recording expired" for older files)

---

## Next Steps

### Content Expansion - Primary Training Modules
Complete the training content by adding all remaining modules for the Primary program:

- [ ] **The Science** - Developmental research and why our approach works
- [ ] **How the Program Works** - Daily life, methods, materials
- [ ] **Outcomes** - What we deliver and how to talk about it
- [ ] **The Admissions Conversation** - Flow, structure, key messages
- [ ] **Objection Handling** - Common questions and how to respond
- [ ] **Qualification** - Identifying good-fit and wrong-fit families
- [ ] **What You Must Never Say** - Hard rules and escalation paths

Each module will include:
- Educational content with callouts and examples
- Multiple choice knowledge checks
- Voice exercises for practicing real conversation scenarios

---

## Repository
https://github.com/rahul-raghavan/pep-training-app
