-- Migration: User Management Permissions
-- Run this in the Supabase SQL Editor before deploying

-- Add pre_assigned_role column to trainees table
-- This stores the role a super_admin assigns when pre-registering a user.
-- On first Google login, the auth callback reads this and sets the profile role accordingly,
-- then clears it (sets to null) so it's one-time use.
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS pre_assigned_role TEXT
  CHECK (pre_assigned_role IN ('super_admin', 'admin', 'user'));
