-- ============================================================================
-- Migration: centers + teacher/course program-track mappings
-- Adds the data model required by the wireframe v7 admin views.
--
-- Vocabulary (the wireframes call them "programs", we keep the existing
-- `programs` table as the *course catalog* and introduce a separate
-- `program_tracks` for the wireframe sense — Primary, Elementary, etc.):
--
--   • centers              — physical school locations (HSR, Whitefield, …)
--   • teacher_centers      — 1:1 trainee → center
--   • program_tracks       — track concept (Toddler / Primary / Elementary /
--                            Middle / HR / Admin)
--   • teacher_programs     — M:N trainee → program_track (a teacher belongs to
--                            one or more tracks)
--   • course_programs      — M:N course (programs row) → program_track
--   • profiles.admin_scope_* — center + tracks an admin manages
--   • trainees.pre_assigned_admin_scope_track_ids — staged scope, applied at
--                            first sign-in by the auth callback
--
-- Existing `trainee_programs` table is unrelated — that's the *enrollment*
-- junction (trainee → courses). Don't touch it here.
-- This migration is additive only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- centers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS centers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  city        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS centers_slug_idx ON centers(slug);

-- ----------------------------------------------------------------------------
-- program_tracks  (created BEFORE teacher_programs / course_programs so their
--                  FKs resolve cleanly)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS program_tracks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- teacher_centers — each trainee belongs to exactly one center
-- (junction table rather than a column on trainees so we can carry assignment
-- metadata and re-assign without touching the trainee row.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_centers (
  trainee_id  UUID PRIMARY KEY REFERENCES trainees(id) ON DELETE CASCADE,
  center_id   UUID NOT NULL REFERENCES centers(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teacher_centers_center_idx ON teacher_centers(center_id);

-- ----------------------------------------------------------------------------
-- teacher_programs — a trainee can belong to multiple program tracks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_programs (
  trainee_id  UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  program_id  UUID NOT NULL REFERENCES program_tracks(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trainee_id, program_id)
);

CREATE INDEX IF NOT EXISTS teacher_programs_program_idx ON teacher_programs(program_id);

-- ----------------------------------------------------------------------------
-- course_programs — courses (programs rows) can be scoped to one or more tracks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_programs (
  program_id  UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES program_tracks(id) ON DELETE CASCADE,
  PRIMARY KEY (program_id, track_id)
);

CREATE INDEX IF NOT EXISTS course_programs_track_idx ON course_programs(track_id);

-- ----------------------------------------------------------------------------
-- profiles.admin_scope_* — what an admin can see/manage
--   • super_admin: nulls (sees everything)
--   • admin:       (center_id, program_track_ids[]) — pinned to one center,
--                  managing one or more tracks within it
--   • user:        nulls
-- ----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_scope_center_id  UUID REFERENCES centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_scope_center_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS admin_scope_track_ids  UUID[] DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS profiles_admin_scope_center_idx
  ON profiles(admin_scope_center_id);

-- ----------------------------------------------------------------------------
-- trainees.pre_assigned_admin_scope_track_ids — staged admin scope for users
-- created before they've signed in for the first time. The auth callback reads
-- this on first login and copies it to profiles.admin_scope_track_ids, then
-- clears it. The center comes from teacher_centers (already keyed by trainee_id).
-- ----------------------------------------------------------------------------
ALTER TABLE trainees
  ADD COLUMN IF NOT EXISTS pre_assigned_admin_scope_center_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS pre_assigned_admin_scope_track_ids UUID[] DEFAULT '{}'::uuid[];

-- ----------------------------------------------------------------------------
-- Seeds — idempotent (ON CONFLICT DO NOTHING). Tracks first because Add user
-- depends on them.
-- ----------------------------------------------------------------------------
INSERT INTO program_tracks (slug, name) VALUES
  ('toddler',     'Toddler'),
  ('primary',     'Primary'),
  ('elementary',  'Elementary'),
  ('middle',      'Middle School'),
  ('hr',          'HR'),
  ('admin',       'Admin')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO centers (slug, name, city) VALUES
  ('hsr',        'HSR',        'Bengaluru'),
  ('whitefield', 'Whitefield', 'Bengaluru'),
  ('varthur',    'Varthur',    'Bengaluru'),
  ('sarjapura',  'Sarjapura',  'Bengaluru'),
  ('kokapet',    'Kokapet',    'Hyderabad')
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Done. Wire-up notes for the app:
--   • Add Supabase RLS policies on these tables (admin sees own center,
--     super_admin sees all). Not included here so each table can be reviewed.
--   • The /api/manager and /api/admin endpoints should filter heatmap/cohort
--     queries by (admin_scope_center_id, admin_scope_track_ids).
-- ----------------------------------------------------------------------------
