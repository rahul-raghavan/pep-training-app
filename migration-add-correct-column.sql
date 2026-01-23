-- Migration: Add 'correct' column to responses table
-- Run this in the Supabase SQL Editor if you already have the database set up

ALTER TABLE responses ADD COLUMN IF NOT EXISTS correct BOOLEAN;
