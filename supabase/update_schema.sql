-- Database Schema Upgrades for Uni-Assist Remediation
-- Run this in your Supabase SQL Editor to sync the production database schema

-- 1. Add index_number to public.students table
alter table public.students 
add column if not exists index_number text;

-- 2. Add lecturer_id foreign key link to public.course_outlines table
-- This fixes the error: Could not find the 'lecturer_id' column of 'course_outlines' in the schema cache
alter table public.course_outlines 
add column if not exists lecturer_id uuid references auth.users(id) on delete set null;

-- 3. Ensure updated_at column exists (for tracking outline modifications)
alter table public.course_outlines 
add column if not exists updated_at timestamptz not null default now();
