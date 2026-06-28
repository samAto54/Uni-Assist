-- ================================================================
-- Migration: Course Enrollments + Inquiry Messaging
-- Run in: https://supabase.com/dashboard/project/yfjqsgiyzgvpvwdhhsfj/sql
-- ================================================================

-- ── 1. COURSE ENROLLMENTS ─────────────────────────────────────────────────────
-- Tracks which students are enrolled in which courses.
-- One row per student per course. Unique constraint prevents double-counting.

CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_code text NOT NULL REFERENCES public.courses(code) ON DELETE CASCADE,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, course_code)
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Students can enroll themselves
CREATE POLICY "Students can enroll themselves"
ON public.course_enrollments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Students can see their own enrollments
CREATE POLICY "Students can read own enrollments"
ON public.course_enrollments FOR SELECT TO authenticated
USING (auth.uid() = student_id);

-- Lecturers can read all enrollments (for class size)
CREATE POLICY "Lecturers can read all enrollments"
ON public.course_enrollments FOR SELECT TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

-- ── 2. INQUIRY MESSAGES ───────────────────────────────────────────────────────
-- Each inquiry now has a thread of messages (student ↔ lecturer).
-- The original inquiries table stays as the "thread header".
-- Messages belong to an inquiry and have a sender_role.

CREATE TABLE IF NOT EXISTS public.inquiry_messages (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id   uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
    sender_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_role  text NOT NULL CHECK (sender_role IN ('student', 'lecturer')),
    content      text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;

-- Students can insert messages on their own inquiries
CREATE POLICY "Students can message on own inquiries"
ON public.inquiry_messages FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM public.inquiries
        WHERE id = inquiry_id AND student_id = auth.uid()
    )
);

-- Lecturers can insert messages on any inquiry
CREATE POLICY "Lecturers can reply to any inquiry"
ON public.inquiry_messages FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer'
);

-- Students can read messages on their own inquiries
CREATE POLICY "Students can read own inquiry messages"
ON public.inquiry_messages FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.inquiries
        WHERE id = inquiry_id AND student_id = auth.uid()
    )
);

-- Lecturers can read all inquiry messages
CREATE POLICY "Lecturers can read all inquiry messages"
ON public.inquiry_messages FOR SELECT TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

-- ── 3. Add class_size column to courses (if not exists) ───────────────────────
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS class_size int NOT NULL DEFAULT 0;

-- ── 4. Migrate existing inquiries: seed first message from question field ─────
-- This converts old one-shot inquiries into threaded messages.
INSERT INTO public.inquiry_messages (inquiry_id, sender_id, sender_role, content, created_at)
SELECT i.id, i.student_id, 'student', i.question, i.created_at
FROM public.inquiries i
WHERE NOT EXISTS (
    SELECT 1 FROM public.inquiry_messages m WHERE m.inquiry_id = i.id
);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('course_enrollments', 'inquiry_messages')
ORDER BY tablename, cmd;
