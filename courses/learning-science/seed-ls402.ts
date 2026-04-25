import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
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

// --- Markdown Parser ---

interface ParsedProgram {
  title: string;
  slug: string;
  description: string;
  passing_score: number;
  sections: ParsedSection[];
  assessment: ParsedAssessmentQuestion[];
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
  block_type: 'text' | 'callout' | 'table' | 'quote' | 'video';
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
  sample_answer?: string;
  sort_order: number;
}

interface ParsedAssessmentQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  module_label: string;
  sort_order: number;
}

function parseMarkdown(content: string): ParsedProgram {
  const lines = content.split('\n');

  // Parse program metadata
  const title = lines[0].replace(/^#\s+/, '');
  let slug = '';
  let description = '';
  let passing_score = 70;

  for (let i = 1; i < Math.min(20, lines.length); i++) {
    if (lines[i].startsWith('**Slug:**') && !slug) slug = lines[i].replace('**Slug:**', '').trim();
    if (lines[i].startsWith('**Description:**') && !description) description = lines[i].replace('**Description:**', '').trim();
    if (lines[i].startsWith('**Passing Score:**')) passing_score = parseInt(lines[i].replace('**Passing Score:**', '').trim());
    // Stop after we find the first section divider
    if (lines[i].startsWith('---')) break;
  }

  // Split into sections and assessment
  const sectionRegex = /^## Section \d+:/;
  const assessmentRegex = /^## Assessment/;

  const sectionStarts: number[] = [];
  let assessmentStart = -1;

  for (let i = 0; i < lines.length; i++) {
    if (sectionRegex.test(lines[i])) sectionStarts.push(i);
    if (assessmentRegex.test(lines[i])) assessmentStart = i;
  }

  // Parse sections
  const sections: ParsedSection[] = [];
  for (let s = 0; s < sectionStarts.length; s++) {
    const start = sectionStarts[s];
    const end = s < sectionStarts.length - 1 ? sectionStarts[s + 1] : (assessmentStart > 0 ? assessmentStart : lines.length);
    const sectionLines = lines.slice(start, end);
    sections.push(parseSection(sectionLines, s));
  }

  // Parse assessment
  const assessment: ParsedAssessmentQuestion[] = [];
  if (assessmentStart > 0) {
    const assessmentLines = lines.slice(assessmentStart);
    const questions = splitByPattern(assessmentLines, /^#### Q\d+:/);
    questions.forEach((qLines, idx) => {
      if (qLines.length > 0) {
        assessment.push(parseAssessmentQuestion(qLines, idx));
      }
    });
  }

  return { title, slug, description, passing_score, sections, assessment };
}

function parseSection(lines: string[], sortOrder: number): ParsedSection {
  const title = lines[0].replace(/^## Section \d+:\s*/, '');
  let slug = '';
  let estimated_minutes = 15;

  for (let i = 1; i < Math.min(10, lines.length); i++) {
    if (lines[i].startsWith('**Slug:**')) slug = lines[i].replace('**Slug:**', '').trim();
    if (lines[i].startsWith('**Estimated Minutes:**')) estimated_minutes = parseInt(lines[i].replace('**Estimated Minutes:**', '').trim());
  }

  // Find ### Content and ### Exercises boundaries
  let contentStart = -1;
  let exercisesStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '### Content') contentStart = i + 1;
    if (lines[i].trim() === '### Exercises') exercisesStart = i + 1;
  }

  // Parse content blocks
  const content_blocks: ParsedContentBlock[] = [];
  if (contentStart > 0) {
    const contentEnd = exercisesStart > 0 ? exercisesStart - 1 : lines.length;
    const contentLines = lines.slice(contentStart, contentEnd);
    const blocks = parseContentBlocks(contentLines);
    content_blocks.push(...blocks);
  }

  // Parse exercises
  const exercises: ParsedExercise[] = [];
  if (exercisesStart > 0) {
    const exerciseLines = lines.slice(exercisesStart);
    const exBlocks = splitByPattern(exerciseLines, /^#### (Multiple Choice|Voice Exercise|Short Answer):/);
    exBlocks.forEach((exLines, idx) => {
      if (exLines.length > 0) {
        exercises.push(parseExercise(exLines, idx));
      }
    });
  }

  return { title, slug, estimated_minutes, sort_order: sortOrder, content_blocks, exercises };
}

function parseContentBlocks(lines: string[]): ParsedContentBlock[] {
  const blocks: ParsedContentBlock[] = [];
  let currentText: string[] = [];
  let blockOrder = 0;

  function flushText() {
    const text = currentText.join('\n').trim();
    if (text) {
      blocks.push({ block_type: 'text', content: text, sort_order: blockOrder++ });
    }
    currentText = [];
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Callout: > [!info], > [!warning], > [!tip]
    if (/^> \[!(info|warning|tip)\]/.test(line)) {
      flushText();
      const variant = line.match(/\[!(info|warning|tip)\]/)?.[1] || 'info';
      const calloutLines: string[] = [];
      i++; // skip the [!variant] line
      while (i < lines.length && lines[i].startsWith('>')) {
        calloutLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ block_type: 'callout', variant, content: calloutLines.join('\n').trim(), sort_order: blockOrder++ });
      continue;
    }

    // Quote with attribution: > "..." \n > — Attribution
    if (/^> "/.test(line) || (/^> /.test(line) && !line.startsWith('> [!'))) {
      // Check if this looks like a quote (has attribution)
      const quoteLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].startsWith('>')) {
        quoteLines.push(lines[j].replace(/^>\s?/, ''));
        j++;
      }
      const joined = quoteLines.join('\n');
      const attrMatch = joined.match(/\n— (.+)$/);
      if (attrMatch) {
        flushText();
        const quoteContent = joined.replace(/\n— .+$/, '').replace(/^"|"$/g, '').trim();
        blocks.push({ block_type: 'quote', content: quoteContent, attribution: attrMatch[1], sort_order: blockOrder++ });
        i = j;
        continue;
      }
      // Not a quote with attribution — treat as regular text
      currentText.push(line);
      i++;
      continue;
    }

    // Table
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[-\s|]+\|/.test(lines[i + 1])) {
      flushText();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const parseTableRow = (row: string) => row
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim());
      const headers = parseTableRow(tableLines[0]);
      const rows = tableLines.slice(2).map(parseTableRow);
      blocks.push({ block_type: 'table', headers, rows, sort_order: blockOrder++ });
      continue;
    }

    // Video
    if (/^\[VIDEO:/.test(line)) {
      flushText();
      const titleMatch = line.match(/\[VIDEO:\s*(.+?)\]/);
      const urlMatch = line.match(/\]\((.+?)\)/);
      blocks.push({
        block_type: 'video',
        content: urlMatch?.[1] || '',
        variant: 'youtube',
        attribution: titleMatch?.[1] || '',
        sort_order: blockOrder++
      });
      i++;
      continue;
    }

    // Regular text
    currentText.push(line);
    i++;
  }

  flushText();
  return blocks;
}

function parseExercise(lines: string[], sortOrder: number): ParsedExercise {
  const headerLine = lines[0];

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
        continue;
      }
      if (lines[i].startsWith('**Explanation:**')) {
        explanation = lines[i].replace('**Explanation:**', '').trim();
      } else if (!sawOption && lines[i].trim()) {
        questionLines.push(lines[i].trim());
      }
    }

    const question = questionLines.join(' ').trim() || title;
    return { exercise_type: 'multiple_choice', question, options, correct_index, explanation, sort_order: sortOrder };
  }

  if (headerLine.includes('Voice Exercise:')) {
    const title = headerLine.replace(/^####\s+Voice Exercise:\s*/, '').trim();
    let scenario = '';
    let guidance = '';
    let ai_prompt = '';

    let currentField = '';
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].startsWith('**Scenario:**')) {
        currentField = 'scenario';
        scenario = lines[i].replace('**Scenario:**', '').trim();
      } else if (lines[i].startsWith('**Guidance:**')) {
        currentField = 'guidance';
        guidance = lines[i].replace('**Guidance:**', '').trim();
      } else if (lines[i].startsWith('**AI Prompt:**')) {
        currentField = 'ai_prompt';
        ai_prompt = lines[i].replace('**AI Prompt:**', '').trim();
      } else if (lines[i].trim() && currentField) {
        // Continuation lines
        if (currentField === 'scenario') scenario += '\n' + lines[i];
        if (currentField === 'guidance') guidance += '\n' + lines[i];
        if (currentField === 'ai_prompt') ai_prompt += '\n' + lines[i];
      }
    }

    return { exercise_type: 'voice', question: title, scenario, guidance, ai_prompt, sort_order: sortOrder };
  }

  if (headerLine.includes('Short Answer:')) {
    const question = headerLine.replace(/^####\s+Short Answer:\s*/, '').trim();
    let sample_answer = '';

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].startsWith('**Sample Answer:**')) {
        sample_answer = lines[i].replace('**Sample Answer:**', '').trim();
      }
    }

    return { exercise_type: 'short_answer', question, sample_answer, sort_order: sortOrder };
  }

  // Fallback
  return { exercise_type: 'multiple_choice', question: headerLine, sort_order: sortOrder };
}

function parseAssessmentQuestion(lines: string[], sortOrder: number): ParsedAssessmentQuestion {
  const title = lines[0].replace(/^####\s+Q\d+:\s*/, '').trim();
  const questionLines: string[] = [];
  let module_label = '';
  const options: string[] = [];
  let correct_index = 0;
  let explanation = '';
  let sawOption = false;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('**Module:**')) {
      module_label = lines[i].replace('**Module:**', '').trim();
      continue;
    }
    const optMatch = lines[i].match(/^- ([A-D]\))\s*(.+)/);
    if (optMatch) {
      sawOption = true;
      let optText = optMatch[2];
      if (optText.includes('✓')) {
        correct_index = options.length;
        optText = optText.replace(/\s*✓\s*/, '').trim();
      }
      options.push(optText);
      continue;
    }
    if (lines[i].startsWith('**Explanation:**')) {
      explanation = lines[i].replace('**Explanation:**', '').trim();
    } else if (!sawOption && lines[i].trim()) {
      questionLines.push(lines[i].trim());
    }
  }

  const question = questionLines.join(' ').trim() || title;
  return { question, options, correct_index, explanation, module_label, sort_order: sortOrder };
}

function splitByPattern(lines: string[], pattern: RegExp): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  let foundFirstMatch = false;

  for (const line of lines) {
    if (pattern.test(line)) {
      if (foundFirstMatch && current.length > 0) groups.push(current);
      current = [line];
      foundFirstMatch = true;
    } else if (foundFirstMatch) {
      current.push(line);
    }
  }
  if (foundFirstMatch && current.length > 0) groups.push(current);
  return groups;
}

// --- Database Seeding ---

async function seed() {
  const mdPath = path.resolve(__dirname, 'LS402-leading-teacher-learning.md');
  const content = fs.readFileSync(mdPath, 'utf-8');
  const program = parseMarkdown(content);

  console.log(`\nParsed program: "${program.title}"`);
  console.log(`  Slug: ${program.slug}`);
  console.log(`  Sections: ${program.sections.length}`);
  console.log(`  Assessment questions: ${program.assessment.length}`);
  console.log(`  Total exercises: ${program.sections.reduce((sum, s) => sum + s.exercises.length, 0)}`);
  console.log('');

  // Check if program already exists
  const { data: existing } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', program.slug)
    .single();

  if (existing) {
    console.log(`⚠️  Program "${program.slug}" already exists. Deleting and re-seeding...`);
    await supabase.from('programs').delete().eq('id', existing.id);
    console.log('   Deleted existing program (cascade deletes sections, blocks, exercises, assessment).\n');
  }

  // Insert program
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
  console.log(`✓ Created program: "${programRow.title}" (${programRow.id})`);

  // Insert sections
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
    console.log(`  ✓ Section ${section.sort_order + 1}: "${section.title}" (${section.content_blocks.length} blocks, ${section.exercises.length} exercises)`);

    // Insert content blocks
    if (section.content_blocks.length > 0) {
      const blocks = section.content_blocks.map(block => ({
        section_id: sectionRow.id,
        sort_order: block.sort_order,
        block_type: block.block_type,
        content: block.content || null,
        variant: block.variant || null,
        headers: block.headers || null,
        rows: block.rows || null,
        attribution: block.attribution || null,
      }));

      const { error: blocksError } = await supabase
        .from('program_content_blocks')
        .insert(blocks);

      if (blocksError) throw new Error(`Failed to insert content blocks for "${section.title}": ${blocksError.message}`);
    }

    // Insert exercises
    if (section.exercises.length > 0) {
      const exercises = section.exercises.map(ex => ({
        section_id: sectionRow.id,
        sort_order: ex.sort_order,
        exercise_type: ex.exercise_type,
        question: ex.question || null,
        options: ex.options || null,
        correct_index: ex.correct_index ?? null,
        explanation: ex.explanation || null,
        scenario: ex.scenario || null,
        guidance: ex.guidance || null,
        ai_prompt: ex.ai_prompt || null,
        sample_answer: ex.sample_answer || null,
      }));

      const { error: exError } = await supabase
        .from('program_exercises')
        .insert(exercises);

      if (exError) throw new Error(`Failed to insert exercises for "${section.title}": ${exError.message}`);
    }
  }

  // Insert assessment questions
  if (program.assessment.length > 0) {
    const assessmentRows = program.assessment.map(q => ({
      program_id: programRow.id,
      sort_order: q.sort_order,
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
      module_label: q.module_label,
    }));

    const { error: assessError } = await supabase
      .from('program_assessment_questions')
      .insert(assessmentRows);

    if (assessError) throw new Error(`Failed to insert assessment questions: ${assessError.message}`);
    console.log(`\n  ✓ Assessment: ${program.assessment.length} questions`);
  }

  console.log('\n✅ Done! Module is seeded and ready.');
  console.log('   → Go to /admin/programs to see it');
  console.log('   → Enroll users from the User Management page');
}

seed().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Failed:', err.message || err);
  process.exit(1);
});
