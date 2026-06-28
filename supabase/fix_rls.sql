-- ================================================================
-- Fix: Row Level Security for inquiries + students tables
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yfjqsgiyzgvpvwdhhsfj/sql
-- ================================================================

-- ── 1. INQUIRIES TABLE ────────────────────────────────────────────────────────
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can insert their own inquiries"  ON public.inquiries;
DROP POLICY IF EXISTS "Students can read their own inquiries"    ON public.inquiries;
DROP POLICY IF EXISTS "Lecturers can read all inquiries"         ON public.inquiries;
DROP POLICY IF EXISTS "Lecturers can update inquiry status"      ON public.inquiries;

-- Students can submit inquiries
CREATE POLICY "Students can insert their own inquiries"
ON public.inquiries FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Students can read their own inquiries
CREATE POLICY "Students can read their own inquiries"
ON public.inquiries FOR SELECT TO authenticated
USING (auth.uid() = student_id);

-- Lecturers can read all inquiries
CREATE POLICY "Lecturers can read all inquiries"
ON public.inquiries FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'lecturer'
    )
);

-- Lecturers can update inquiry status (mark resolved etc.)
CREATE POLICY "Lecturers can update inquiry status"
ON public.inquiries FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'lecturer'
    )
);

-- ── 2. STUDENTS TABLE ─────────────────────────────────────────────────────────
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can insert their own record"  ON public.students;
DROP POLICY IF EXISTS "Students can read their own record"    ON public.students;
DROP POLICY IF EXISTS "Students can update their own record"  ON public.students;
DROP POLICY IF EXISTS "Lecturers can read all students"       ON public.students;

-- Student can create their own record on signup
CREATE POLICY "Students can insert their own record"
ON public.students FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Student can read their own record
CREATE POLICY "Students can read their own record"
ON public.students FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Student can update their own record
CREATE POLICY "Students can update their own record"
ON public.students FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- Lecturers can read all student records (for rosters)
CREATE POLICY "Lecturers can read all students"
ON public.students FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'lecturer'
    )
);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('inquiries', 'students')
ORDER BY tablename, cmd;
