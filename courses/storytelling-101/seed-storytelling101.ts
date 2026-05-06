import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  env[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ParsedProgram {
  title: string;
  slug: string;
  description: string;
  passing_score: number;
  sections: ParsedSection[];
}

interface ParsedSection {
  title: string;
  slug: string;
  estimated_minutes: number;
  sort_order: number;
  content_blocks: ParsedContentBlock[];
  exercises: ParsedExercise[];
}

interface ParsedContentBlock {
  block_type: 'text' | 'callout' | 'table' | 'quote';
  content?: string;
  variant?: string;
  headers?: string[];
  rows?: string[][];
  attribution?: string;
  sort_order: number;
}

interface ParsedExercise {
  exercise_type: 'multiple_choice' | 'voice' | 'short_answer';
  question?: string;
  options?: string[];
  correct_index?: number;
  explanation?: string;
  scenario?: string;
  guidance?: string;
  ai_prompt?: string;
  system_prompt?: string;
  sample_answer?: string;
  sort_order: number;
}

function splitByPattern(lines: string[], pattern: RegExp): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (pattern.test(line) && current.length > 0) {
      blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0 && current.some(line => line.trim())) blocks.push(current);
  return blocks;
}

function parseMarkdown(content: string): ParsedProgram {
  const lines = content.split('\n');
  const title = lines[0].replace(/^#\s+/, '');
  let slug = '';
  let description = '';
  let passing_score = 80;

  for (let i = 1; i < Math.min(20, lines.length); i++) {
    if (lines[i].startsWith('**Slug:**')) slug = lines[i].replace('**Slug:**', '').trim();
    if (lines[i].startsWith('**Description:**')) description = lines[i].replace('**Description:**', '').trim();
    if (lines[i].startsWith('**Passing Score:**')) passing_score = parseInt(lines[i].replace('**Passing Score:**', '').trim(), 10);
    if (lines[i].startsWith('---')) break;
  }

  const sectionStarts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^## Section \d+:/.test(lines[i])) sectionStarts.push(i);
  }

  const sections = sectionStarts.map((start, index) => {
    const end = index < sectionStarts.length - 1 ? sectionStarts[index + 1] : lines.length;
    return parseSection(lines.slice(start, end), index);
  });

  return { title, slug, description, passing_score, sections };
}

function parseSection(lines: string[], sortOrder: number): ParsedSection {
  const title = lines[0].replace(/^## Section \d+:\s*/, '');
  let slug = '';
  let estimated_minutes = 20;

  for (let i = 1; i < Math.min(10, lines.length); i++) {
    if (lines[i].startsWith('**Slug:**')) slug = lines[i].replace('**Slug:**', '').trim();
    if (lines[i].startsWith('**Estimated Minutes:**')) {
      estimated_minutes = parseInt(lines[i].replace('**Estimated Minutes:**', '').trim(), 10);
    }
  }

  let contentStart = -1;
  let exercisesStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '### Content') contentStart = i + 1;
    if (lines[i].trim() === '### Exercises') exercisesStart = i + 1;
  }

  const contentEnd = exercisesStart > 0 ? exercisesStart - 1 : lines.length;
  const content_blocks = contentStart > 0 ? parseContentBlocks(lines.slice(contentStart, contentEnd)) : [];
  const exercises = exercisesStart > 0
    ? splitByPattern(lines.slice(exercisesStart), /^#### (Multiple Choice|Voice Exercise|Short Answer):/)
      .filter(block => /^####/.test(block[0] || ''))
      .map((block, index) => parseExercise(block, index))
    : [];

  return { title, slug, estimated_minutes, sort_order: sortOrder, content_blocks, exercises };
}

function parseContentBlocks(lines: string[]): ParsedContentBlock[] {
  const blocks: ParsedContentBlock[] = [];
  let currentText: string[] = [];
  let blockOrder = 0;

  function flushText() {
    const text = currentText.join('\n').trim();
    if (text) blocks.push({ block_type: 'text', content: text, sort_order: blockOrder++ });
    currentText = [];
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (/^> \[!(info|warning|tip)\]/.test(line)) {
      flushText();
      const variant = line.match(/\[!(info|warning|tip)\]/)?.[1] || 'info';
      const calloutLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith('>')) {
        calloutLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ block_type: 'callout', variant, content: calloutLines.join('\n').trim(), sort_order: blockOrder++ });
      continue;
    }

    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[-\s|]+\|/.test(lines[i + 1])) {
      flushText();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const parseRow = (row: string) => row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
      blocks.push({
        block_type: 'table',
        headers: parseRow(tableLines[0]),
        rows: tableLines.slice(2).map(parseRow),
        sort_order: blockOrder++,
      });
      continue;
    }

    currentText.push(line);
    i++;
  }

  flushText();
  return blocks;
}

function parseExercise(lines: string[], sortOrder: number): ParsedExercise {
  const headerLine = lines[0];

  if (headerLine.includes('Voice Exercise:')) {
    const title = headerLine.replace(/^####\s+Voice Exercise:\s*/, '').trim();
    const fields = parseFields(lines.slice(1), ['Scenario', 'Guidance', 'AI Prompt', 'System Prompt']);
    return {
      exercise_type: 'voice',
      question: title,
      scenario: fields['Scenario'] || '',
      guidance: fields['Guidance'] || '',
      ai_prompt: fields['AI Prompt'] || '',
      system_prompt: fields['System Prompt'] || '',
      sort_order: sortOrder,
    };
  }

  if (headerLine.includes('Short Answer:')) {
    const title = headerLine.replace(/^####\s+Short Answer:\s*/, '').trim();
    const fields = parseFields(lines.slice(1), ['Sample Answer']);
    const questionBody = fields.__body ? `${title}\n${fields.__body}`.trim() : title;
    return {
      exercise_type: 'short_answer',
      question: questionBody,
      sample_answer: fields['Sample Answer'] || '',
      sort_order: sortOrder,
    };
  }

  if (headerLine.includes('Multiple Choice:')) {
    const title = headerLine.replace(/^####\s+Multiple Choice:\s*/, '').trim();
    const questionLines: string[] = [];
    const options: string[] = [];
    let correct_index = 0;
    let explanation = '';
    let sawOption = false;
    for (let i = 1; i < lines.length; i++) {
      const optMatch = lines[i].match(/^- ([A-D]\))\s*(.+)/);
      if (optMatch) {
        sawOption = true;
        let optText = optMatch[2];
        if (optText.includes('✓')) {
          correct_index = options.length;
          optText = optText.replace(/\s*✓\s*/, '').trim();
        }
        options.push(optText);
      } else if (lines[i].startsWith('**Explanation:**')) {
        explanation = lines[i].replace('**Explanation:**', '').trim();
      } else if (!sawOption && lines[i].trim()) {
        questionLines.push(lines[i].trim());
      }
    }
    return {
      exercise_type: 'multiple_choice',
      question: questionLines.join(' ').trim() || title,
      options,
      correct_index,
      explanation,
      sort_order: sortOrder,
    };
  }

  return { exercise_type: 'short_answer', question: headerLine, sort_order: sortOrder };
}

function parseFields(lines: string[], fieldNames: string[]): Record<string, string> {
  const fields: Record<string, string> = { __body: '' };
  let current = '__body';
  const fieldPattern = new RegExp(`^\\*\\*(${fieldNames.map(escapeRegExp).join('|')}):\\*\\*\\s*(.*)$`);

  for (const line of lines) {
    const match = line.match(fieldPattern);
    if (match) {
      current = match[1];
      fields[current] = match[2].trim();
      continue;
    }
    if (!line.trim() && !fields[current]) continue;
    fields[current] = [fields[current], line].filter(Boolean).join('\n').trim();
  }

  return fields;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function embedSystemPrompt(aiPrompt?: string, systemPrompt?: string): string | null {
  const trimmedAiPrompt = aiPrompt?.trim() || '';
  const trimmedSystemPrompt = systemPrompt?.trim() || '';
  if (!trimmedSystemPrompt) return trimmedAiPrompt || null;
  return `[[SYSTEM_PROMPT]]\n${trimmedSystemPrompt}\n[[/SYSTEM_PROMPT]]\n\n${trimmedAiPrompt}`.trim();
}

async function seed() {
  const mdPath = path.resolve(__dirname, 'STORYTELLING101.md');
  const content = fs.readFileSync(mdPath, 'utf-8');
  const program = parseMarkdown(content);

  console.log(`\nParsed program: "${program.title}"`);
  console.log(`  Slug: ${program.slug}`);
  console.log(`  Sections: ${program.sections.length}`);
  console.log(`  Total exercises: ${program.sections.reduce((sum, section) => sum + section.exercises.length, 0)}`);
  console.log('');

  if (process.argv.includes('--dry-run')) {
    console.log('Dry run only. No database changes made.');
    return;
  }

  const { error: systemPromptColumnError } = await supabase
    .from('program_exercises')
    .select('system_prompt')
    .limit(1);

  const supportsSystemPromptColumn = !systemPromptColumnError;
  if (systemPromptColumnError && systemPromptColumnError.code !== '42703') {
    throw new Error(`Failed to inspect program_exercises.system_prompt: ${systemPromptColumnError.message}`);
  }
  if (supportsSystemPromptColumn) {
    console.log('Using program_exercises.system_prompt column for custom prompts.');
  } else {
    console.log('program_exercises.system_prompt is missing; embedding custom prompts in ai_prompt for this seed.');
  }

  const { data: existing } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', program.slug)
    .single();

  if (existing) {
    console.log(`Program "${program.slug}" already exists. Deleting and re-seeding...`);
    await supabase.from('programs').delete().eq('id', existing.id);
    console.log('Deleted existing program.\n');
  }

  const { data: programRow, error: programError } = await supabase
    .from('programs')
    .insert({
      slug: program.slug,
      title: program.title,
      description: program.description,
      passing_score: program.passing_score,
      is_active: true,
    })
    .select()
    .single();

  if (programError) throw new Error(`Failed to insert program: ${programError.message}`);
  console.log(`Created program: "${programRow.title}" (${programRow.id})`);

  const { data: elementaryTrack, error: trackError } = await supabase
    .from('program_tracks')
    .select('id')
    .eq('slug', 'elementary')
    .maybeSingle();

  if (trackError) throw new Error(`Failed to look up Elementary track: ${trackError.message}`);
  if (elementaryTrack) {
    const { error: mappingError } = await supabase
      .from('course_programs')
      .upsert(
        { program_id: programRow.id, track_id: elementaryTrack.id },
        { onConflict: 'program_id,track_id', ignoreDuplicates: true }
      );

    if (mappingError) throw new Error(`Failed to map program to Elementary track: ${mappingError.message}`);
    console.log('Mapped program to Elementary track');
  } else {
    console.log('Elementary track not found; skipping course_programs mapping.');
  }

  for (const section of program.sections) {
    const { data: sectionRow, error: sectionError } = await supabase
      .from('program_sections')
      .insert({
        program_id: programRow.id,
        slug: section.slug,
        title: section.title,
        estimated_minutes: section.estimated_minutes,
        sort_order: section.sort_order,
      })
      .select()
      .single();

    if (sectionError) throw new Error(`Failed to insert section "${section.title}": ${sectionError.message}`);
    console.log(`  Section ${section.sort_order + 1}: "${section.title}" (${section.content_blocks.length} blocks, ${section.exercises.length} exercises)`);

    if (section.content_blocks.length > 0) {
      const { error: blocksError } = await supabase
        .from('program_content_blocks')
        .insert(section.content_blocks.map(block => ({
          section_id: sectionRow.id,
          sort_order: block.sort_order,
          block_type: block.block_type,
          content: block.content || null,
          variant: block.variant || null,
          headers: block.headers || null,
          rows: block.rows || null,
          attribution: block.attribution || null,
        })));
      if (blocksError) throw new Error(`Failed to insert content blocks for "${section.title}": ${blocksError.message}`);
    }

    if (section.exercises.length > 0) {
      const exerciseRows = section.exercises.map(exercise => {
        const row: Record<string, unknown> = {
          section_id: sectionRow.id,
          sort_order: exercise.sort_order,
          exercise_type: exercise.exercise_type,
          question: exercise.question || null,
          options: exercise.options || null,
          correct_index: exercise.correct_index ?? null,
          explanation: exercise.explanation || null,
          scenario: exercise.scenario || null,
          guidance: exercise.guidance || null,
          ai_prompt: supportsSystemPromptColumn
            ? exercise.ai_prompt || null
            : embedSystemPrompt(exercise.ai_prompt, exercise.system_prompt),
          sample_answer: exercise.sample_answer || null,
        };

        if (supportsSystemPromptColumn) {
          row.system_prompt = exercise.system_prompt || null;
        }

        return row;
      });

      const { error: exercisesError } = await supabase
        .from('program_exercises')
        .insert(exerciseRows);
      if (exercisesError) throw new Error(`Failed to insert exercises for "${section.title}": ${exercisesError.message}`);
    }
  }

  console.log('\nDone. STORYTELLING-101 is seeded and ready.');
}

seed().then(() => {
  process.exit(0);
}).catch(error => {
  console.error(error);
  process.exit(1);
});
