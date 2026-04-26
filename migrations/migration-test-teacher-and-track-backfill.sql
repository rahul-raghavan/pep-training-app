-- ============================================================================
-- Migration: track cleanup + Test Teacher defaults
--
-- Idempotent backfill for:
--   * Toddler/Admin program tracks
--   * Middle School course -> Middle School track mappings
--   * Test Teacher account, enrolled in every active course
--   * DB triggers so future active courses/sections automatically include test
--     accounts without affecting stats.
-- ============================================================================

ALTER TABLE trainees
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS trainees_is_test_account_idx
  ON trainees(is_test_account);

INSERT INTO program_tracks (slug, name) VALUES
  ('toddler', 'Toddler'),
  ('primary', 'Primary'),
  ('elementary', 'Elementary'),
  ('middle', 'Middle School'),
  ('hr', 'HR'),
  ('admin', 'Admin')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

WITH middle_track AS (
  SELECT id FROM program_tracks WHERE slug = 'middle'
),
middle_courses AS (
  SELECT id
  FROM programs
  WHERE slug IN (
    'ms-philosophy-101',
    'ms-201',
    'ms-202',
    'ms-203',
    'ms-204',
    'ms-205',
    'ms-206',
    'ms-conduct'
  )
)
INSERT INTO course_programs (program_id, track_id)
SELECT middle_courses.id, middle_track.id
FROM middle_courses
CROSS JOIN middle_track
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  test_trainee_id UUID;
BEGIN
  SELECT id INTO test_trainee_id
  FROM trainees
  WHERE lower(email) = 'testteacher@pepschoolv2.com'
  ORDER BY created_at ASC
  LIMIT 1;

  IF test_trainee_id IS NULL THEN
    INSERT INTO trainees (
      name,
      email,
      access_token,
      pre_assigned_role,
      is_test_account
    )
    VALUES (
      'Test Teacher',
      'testteacher@pepschoolv2.com',
      gen_random_uuid()::text,
      'user',
      TRUE
    )
    RETURNING id INTO test_trainee_id;
  ELSE
    UPDATE trainees
    SET
      name = 'Test Teacher',
      email = 'testteacher@pepschoolv2.com',
      pre_assigned_role = COALESCE(pre_assigned_role, 'user'),
      is_test_account = TRUE
    WHERE id = test_trainee_id;
  END IF;

  INSERT INTO trainee_programs (trainee_id, program_id)
  SELECT test_trainee_id, id
  FROM programs
  WHERE is_active = TRUE
  ON CONFLICT DO NOTHING;

  INSERT INTO progress (trainee_id, section_id, status)
  SELECT test_trainee_id, ps.id::text, 'not_started'
  FROM program_sections ps
  JOIN programs p ON p.id = ps.program_id
  WHERE p.is_active = TRUE
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION enroll_test_accounts_for_program()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    INSERT INTO trainee_programs (trainee_id, program_id)
    SELECT id, NEW.id
    FROM trainees
    WHERE is_test_account = TRUE
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS programs_enroll_test_accounts ON programs;
CREATE TRIGGER programs_enroll_test_accounts
AFTER INSERT ON programs
FOR EACH ROW
EXECUTE FUNCTION enroll_test_accounts_for_program();

CREATE OR REPLACE FUNCTION enroll_test_account_in_all_courses()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_test_account = TRUE THEN
    INSERT INTO trainee_programs (trainee_id, program_id)
    SELECT NEW.id, id
    FROM programs
    WHERE is_active = TRUE
    ON CONFLICT DO NOTHING;

    INSERT INTO progress (trainee_id, section_id, status)
    SELECT NEW.id, ps.id::text, 'not_started'
    FROM program_sections ps
    JOIN programs p ON p.id = ps.program_id
    WHERE p.is_active = TRUE
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trainees_enroll_test_account ON trainees;
CREATE TRIGGER trainees_enroll_test_account
AFTER INSERT OR UPDATE OF is_test_account ON trainees
FOR EACH ROW
EXECUTE FUNCTION enroll_test_account_in_all_courses();

CREATE OR REPLACE FUNCTION init_test_progress_for_section()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO progress (trainee_id, section_id, status)
  SELECT id, NEW.id::text, 'not_started'
  FROM trainees
  WHERE is_test_account = TRUE
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS program_sections_init_test_progress ON program_sections;
CREATE TRIGGER program_sections_init_test_progress
AFTER INSERT ON program_sections
FOR EACH ROW
EXECUTE FUNCTION init_test_progress_for_section();
