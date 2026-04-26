-- ============================================================================
-- Migration: multi-center admin scope
--
-- Keeps the existing single-center admin_scope_center_id for backwards
-- compatibility, and adds admin_scope_center_ids for admins who manage more
-- than one center.
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_scope_center_ids UUID[] DEFAULT '{}'::uuid[];

UPDATE profiles
SET admin_scope_center_ids = ARRAY[admin_scope_center_id]::uuid[]
WHERE admin_scope_center_id IS NOT NULL
  AND (admin_scope_center_ids IS NULL OR array_length(admin_scope_center_ids, 1) IS NULL);

ALTER TABLE trainees
  ADD COLUMN IF NOT EXISTS pre_assigned_admin_scope_center_ids UUID[] DEFAULT '{}'::uuid[];

UPDATE trainees t
SET pre_assigned_admin_scope_center_ids = ARRAY[tc.center_id]::uuid[]
FROM teacher_centers tc
WHERE tc.trainee_id = t.id
  AND t.pre_assigned_role = 'admin'
  AND (t.pre_assigned_admin_scope_center_ids IS NULL OR array_length(t.pre_assigned_admin_scope_center_ids, 1) IS NULL);
