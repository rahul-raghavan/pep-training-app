/**
 * Delete a program and all its related data.
 * Usage: npx tsx src/scripts/delete-program.ts admissions-training
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: npx tsx src/scripts/delete-program.ts <program-slug>');
  process.exit(1);
}

const envPath = path.resolve(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: program } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!program) {
    console.log(`No program found with slug "${slug}"`);
    return;
  }

  console.log(`Found program: ${program.id}`);

  // Get sections to cascade-delete their children
  const { data: sections } = await supabase
    .from('program_sections')
    .select('id')
    .eq('program_id', program.id);

  const sectionIds = (sections || []).map(s => s.id);
  console.log(`Sections to delete: ${sectionIds.length}`);

  if (sectionIds.length > 0) {
    await supabase.from('program_content_blocks').delete().in('section_id', sectionIds);
    console.log('  Deleted content blocks');
    await supabase.from('program_exercises').delete().in('section_id', sectionIds);
    console.log('  Deleted exercises');
  }

  await supabase.from('program_sections').delete().eq('program_id', program.id);
  console.log('  Deleted sections');

  await supabase.from('program_assessment_questions').delete().eq('program_id', program.id);
  console.log('  Deleted assessment questions');

  await supabase.from('trainee_programs').delete().eq('program_id', program.id);
  console.log('  Deleted trainee enrollments');

  await supabase.from('programs').delete().eq('id', program.id);
  console.log('  Deleted program');

  console.log('\nDone!');
}

main().catch(console.error);
