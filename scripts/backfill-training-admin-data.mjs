import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env.local');
const TEST_EMAIL = 'testteacher@pepschoolv2.com';
const TEST_NAME = 'Test Teacher';

function loadEnv() {
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  const env = {};
  for (const line of raw.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1).replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return env;
}

function requireOk(label, error) {
  if (error) {
    console.error(`${label}:`, error);
    process.exit(1);
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const trackSeeds = [
  { slug: 'toddler', name: 'Toddler' },
  { slug: 'primary', name: 'Primary' },
  { slug: 'elementary', name: 'Elementary' },
  { slug: 'middle', name: 'Middle School' },
  { slug: 'hr', name: 'HR' },
  { slug: 'admin', name: 'Admin' },
];

const middleSchoolSlugs = [
  'ms-philosophy-101',
  'ms-201',
  'ms-202',
  'ms-203',
  'ms-204',
  'ms-205',
  'ms-206',
  'ms-conduct',
];

const elementarySlugs = [
  'elem-001',
  'elem-101',
  'elem-102',
  'elem-103',
  'elem-104',
  'storytelling-101',
];

const learningScienceSlugs = [
  'learning-science-101',
  'how-learning-works',
  'formative-assessment',
  'feedback-student-ownership',
  'designing-durable-learning',
  'leading-teacher-learning',
];

async function main() {
  const { error: trackUpsertError } = await supabase
    .from('program_tracks')
    .upsert(trackSeeds, { onConflict: 'slug' });
  requireOk('program_tracks upsert failed', trackUpsertError);

  const { data: tracks, error: tracksError } = await supabase
    .from('program_tracks')
    .select('id, slug, name');
  requireOk('program_tracks fetch failed', tracksError);

  const trackBySlug = new Map((tracks ?? []).map(track => [track.slug, track]));
  const middleTrack = trackBySlug.get('middle');
  const elementaryTrack = trackBySlug.get('elementary');
  if (!middleTrack) {
    console.error('Middle School track missing after upsert');
    process.exit(1);
  }
  if (!elementaryTrack) {
    console.error('Elementary track missing after upsert');
    process.exit(1);
  }

  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('id, slug, title, is_active')
    .eq('is_active', true);
  requireOk('programs fetch failed', programsError);

  const activePrograms = programs ?? [];
  const middleCourses = activePrograms.filter(program => middleSchoolSlugs.includes(program.slug));
  const mappingRows = middleCourses.map(program => ({
    program_id: program.id,
    track_id: middleTrack.id,
  }));
  if (mappingRows.length > 0) {
    const { error: mappingError } = await supabase
      .from('course_programs')
      .upsert(mappingRows, { onConflict: 'program_id,track_id', ignoreDuplicates: true });
    requireOk('middle-school course_programs upsert failed', mappingError);
  }

  const elementaryCourses = activePrograms.filter(program => elementarySlugs.includes(program.slug));
  const elementaryMappingRows = elementaryCourses.map(program => ({
    program_id: program.id,
    track_id: elementaryTrack.id,
  }));
  if (elementaryMappingRows.length > 0) {
    const { error: mappingError } = await supabase
      .from('course_programs')
      .upsert(elementaryMappingRows, { onConflict: 'program_id,track_id', ignoreDuplicates: true });
    requireOk('elementary course_programs upsert failed', mappingError);
  }

  const learningScienceCourses = activePrograms.filter(program => learningScienceSlugs.includes(program.slug));
  const learningScienceMappingRows = learningScienceCourses.flatMap(program => [
    { program_id: program.id, track_id: elementaryTrack.id },
    { program_id: program.id, track_id: middleTrack.id },
  ]);
  if (learningScienceMappingRows.length > 0) {
    const { error: mappingError } = await supabase
      .from('course_programs')
      .upsert(learningScienceMappingRows, { onConflict: 'program_id,track_id', ignoreDuplicates: true });
    requireOk('learning-science course_programs upsert failed', mappingError);
  }

  const { data: existingTrainees, error: traineeLookupError } = await supabase
    .from('trainees')
    .select('id, user_id, email')
    .ilike('email', TEST_EMAIL)
    .order('created_at', { ascending: true })
    .limit(1);
  requireOk('test trainee lookup failed', traineeLookupError);

  let testTrainee = existingTrainees?.[0] ?? null;
  if (!testTrainee) {
    const { data, error } = await supabase
      .from('trainees')
      .insert({
        name: TEST_NAME,
        email: TEST_EMAIL,
        access_token: crypto.randomUUID(),
        pre_assigned_role: 'user',
        is_test_account: true,
      })
      .select('id, user_id, email')
      .single();
    requireOk('test trainee insert failed', error);
    testTrainee = data;
  } else {
    const { data, error } = await supabase
      .from('trainees')
      .update({
        name: TEST_NAME,
        email: TEST_EMAIL,
        pre_assigned_role: 'user',
        is_test_account: true,
      })
      .eq('id', testTrainee.id)
      .select('id, user_id, email')
      .single();
    requireOk('test trainee update failed', error);
    testTrainee = data;
  }

  const { data: profile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', TEST_EMAIL)
    .maybeSingle();
  requireOk('test profile lookup failed', profileLookupError);

  if (profile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name: TEST_NAME, role: 'user', is_active: true })
      .eq('id', profile.id);
    requireOk('test profile update failed', profileError);

    const { error: linkError } = await supabase
      .from('trainees')
      .update({ user_id: profile.id })
      .eq('id', testTrainee.id);
    requireOk('test trainee profile link failed', linkError);
  }

  const enrollmentRows = activePrograms.map(program => ({
    trainee_id: testTrainee.id,
    program_id: program.id,
  }));
  if (enrollmentRows.length > 0) {
    const { error: enrollmentError } = await supabase
      .from('trainee_programs')
      .upsert(enrollmentRows, { onConflict: 'trainee_id,program_id', ignoreDuplicates: true });
    requireOk('test trainee enrollment upsert failed', enrollmentError);
  }

  const activeProgramIds = activePrograms.map(program => program.id);
  const { data: sections, error: sectionsError } = activeProgramIds.length
    ? await supabase
        .from('program_sections')
        .select('id, program_id')
        .in('program_id', activeProgramIds)
    : { data: [], error: null };
  requireOk('program sections fetch failed', sectionsError);

  const progressRows = (sections ?? []).map(section => ({
    trainee_id: testTrainee.id,
    section_id: section.id,
    status: 'not_started',
  }));
  for (let i = 0; i < progressRows.length; i += 500) {
    const batch = progressRows.slice(i, i + 500);
    if (batch.length === 0) continue;
    const { error: progressError } = await supabase
      .from('progress')
      .upsert(batch, { onConflict: 'trainee_id,section_id', ignoreDuplicates: true });
    requireOk('test trainee progress upsert failed', progressError);
  }

  const { count: testEnrollmentCount, error: countError } = await supabase
    .from('trainee_programs')
    .select('*', { count: 'exact', head: true })
    .eq('trainee_id', testTrainee.id);
  requireOk('test enrollment count failed', countError);

  console.log(JSON.stringify({
    tracks: trackSeeds.map(track => track.slug),
    middleSchoolCoursesMapped: middleCourses.map(course => course.slug),
    elementaryCoursesMapped: elementaryCourses.map(course => course.slug),
    learningScienceCoursesMapped: learningScienceCourses.map(course => course.slug),
    testTeacher: {
      id: testTrainee.id,
      email: TEST_EMAIL,
      enrollments: testEnrollmentCount ?? 0,
      progressRows: progressRows.length,
    },
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
