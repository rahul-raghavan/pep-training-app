/**
 * Migration script: Copy legacy hardcoded content into a DB-backed program.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-legacy-content.ts
 */

import { createClient } from '@supabase/supabase-js';
import { sections } from '../content/sections';
import { assessmentQuestions, PASSING_SCORE, TOTAL_QUESTIONS } from '../content/assessment';
import fs from 'fs';
import path from 'path';

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const PROGRAM_SLUG = 'admissions-training';
const PROGRAM_TITLE = 'PEP Admissions Training';
const PROGRAM_DESCRIPTION = 'Learn how to have meaningful conversations with families considering PEP for their children.';

async function main() {
  console.log('Starting legacy content migration...\n');

  // 1. Create program
  console.log(`Creating program: ${PROGRAM_TITLE}`);
  const passingPercent = Math.round((PASSING_SCORE / TOTAL_QUESTIONS) * 100);

  const { data: program, error: programError } = await supabase
    .from('programs')
    .insert({
      slug: PROGRAM_SLUG,
      title: PROGRAM_TITLE,
      description: PROGRAM_DESCRIPTION,
      passing_score: passingPercent,
      is_active: true,
    })
    .select()
    .single();

  if (programError) {
    if (programError.code === '23505') {
      console.error(`Program with slug "${PROGRAM_SLUG}" already exists. Delete it first or change the slug.`);
    } else {
      console.error('Failed to create program:', programError);
    }
    process.exit(1);
  }

  console.log(`  Created program: ${program.id}\n`);

  // 2. Create sections with content blocks and exercises
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const slug = section.id; // legacy IDs are already slug-friendly

    console.log(`Creating section ${i + 1}/${sections.length}: ${section.title}`);

    const { data: dbSection, error: sectionError } = await supabase
      .from('program_sections')
      .insert({
        program_id: program.id,
        slug,
        title: section.title,
        estimated_minutes: section.estimatedMinutes,
        sort_order: i,
      })
      .select()
      .single();

    if (sectionError) {
      console.error(`  Failed to create section "${section.title}":`, sectionError);
      continue;
    }

    // Create content blocks
    for (let j = 0; j < section.content.length; j++) {
      const block = section.content[j];

      const insertData: Record<string, unknown> = {
        section_id: dbSection.id,
        sort_order: j,
        block_type: block.type,
      };

      switch (block.type) {
        case 'text':
          insertData.content = block.content;
          break;
        case 'callout':
          insertData.content = block.content;
          insertData.variant = block.variant;
          break;
        case 'table':
          insertData.headers = block.headers;
          insertData.rows = block.rows;
          break;
        case 'quote':
          insertData.content = block.content;
          insertData.attribution = block.attribution || null;
          break;
      }

      const { error: blockError } = await supabase
        .from('program_content_blocks')
        .insert(insertData);

      if (blockError) {
        console.error(`  Failed to create content block ${j}:`, blockError);
      }
    }

    console.log(`  ${section.content.length} content blocks created`);

    // Create exercises
    for (let j = 0; j < section.exercises.length; j++) {
      const exercise = section.exercises[j];

      const insertData: Record<string, unknown> = {
        section_id: dbSection.id,
        sort_order: j,
        exercise_type: exercise.type,
      };

      switch (exercise.type) {
        case 'multiple_choice':
          insertData.question = exercise.question;
          insertData.options = exercise.options;
          insertData.correct_index = exercise.correctIndex;
          insertData.explanation = exercise.explanation;
          break;
        case 'voice':
          insertData.scenario = exercise.scenario;
          insertData.guidance = exercise.guidance;
          insertData.ai_prompt = exercise.aiPrompt;
          break;
        case 'short_answer':
          insertData.question = exercise.question;
          insertData.sample_answer = exercise.sampleAnswer;
          break;
      }

      const { error: exerciseError } = await supabase
        .from('program_exercises')
        .insert(insertData);

      if (exerciseError) {
        console.error(`  Failed to create exercise ${j}:`, exerciseError);
      }
    }

    console.log(`  ${section.exercises.length} exercises created`);
  }

  // 3. Create assessment questions
  console.log(`\nCreating ${assessmentQuestions.length} assessment questions...`);

  for (let i = 0; i < assessmentQuestions.length; i++) {
    const q = assessmentQuestions[i];

    const { error: questionError } = await supabase
      .from('program_assessment_questions')
      .insert({
        program_id: program.id,
        sort_order: i,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation,
        module_label: q.module,
      });

    if (questionError) {
      console.error(`  Failed to create question ${i + 1}:`, questionError);
    }
  }

  console.log(`  ${assessmentQuestions.length} assessment questions created`);

  // Summary
  const totalBlocks = sections.reduce((sum, s) => sum + s.content.length, 0);
  const totalExercises = sections.reduce((sum, s) => sum + s.exercises.length, 0);

  console.log(`
Migration complete!
  Program:    ${PROGRAM_TITLE} (${program.id})
  Slug:       ${PROGRAM_SLUG}
  Sections:   ${sections.length}
  Content:    ${totalBlocks} blocks
  Exercises:  ${totalExercises}
  Assessment: ${assessmentQuestions.length} questions (passing: ${passingPercent}%)

  Trainee URL: /train/{token}/p/${PROGRAM_SLUG}
`);
}

main().catch(console.error);
