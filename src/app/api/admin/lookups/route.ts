import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { sortProgramTracks } from '@/lib/course-order';

interface Center {
  id: string;
  slug: string;
  name: string;
  city: string | null;
}

interface ProgramTrack {
  id: string;
  slug: string;
  name: string;
}

/**
 * GET /api/admin/lookups
 * Returns reference data used by admin screens (Add user, Cohort, Assignments).
 * Returns empty arrays if the centers/program_tracks tables don't exist yet
 * (i.e. the schema migration hasn't been applied) — so the UI can still render.
 */
export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();

  let centers: Center[] = [];
  let programTracks: ProgramTrack[] = [];
  let migrationApplied = true;

  try {
    const { data, error } = await supabase
      .from('centers')
      .select('id, slug, name, city')
      .eq('is_active', true)
      .order('name');
    if (error) {
      // 42P01 = relation does not exist (table missing). Graceful fallback.
      if (error.code === '42P01') migrationApplied = false;
      else console.error('lookups: centers query error', error);
    } else {
      centers = data ?? [];
    }
  } catch (e) {
    console.error('lookups: centers exception', e);
  }

  try {
    const { data, error } = await supabase
      .from('program_tracks')
      .select('id, slug, name')
      .eq('is_active', true)
      .order('name');
    if (error) {
      if (error.code === '42P01') migrationApplied = false;
      else console.error('lookups: program_tracks query error', error);
    } else {
      programTracks = sortProgramTracks(data ?? []);
    }
  } catch (e) {
    console.error('lookups: program_tracks exception', e);
  }

  return NextResponse.json({
    centers,
    programTracks,
    migrationApplied,
  });
}
