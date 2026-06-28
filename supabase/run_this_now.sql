-- ================================================================
-- COMPLETE FIX — Run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/yfjqsgiyzgvpvwdhhsfj/sql/new
-- ================================================================

-- ── 1. Fix courses table — add missing columns ────────────────────────────────
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS class_size  integer NOT NULL DEFAULT 0;

-- ── 2. COURSE ENROLLMENTS table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_code text        NOT NULL,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, course_code)
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can enroll"            ON public.course_enrollments;
DROP POLICY IF EXISTS "Students can read enrollments"  ON public.course_enrollments;
DROP POLICY IF EXISTS "Lecturers can read enrollments" ON public.course_enrollments;

CREATE POLICY "Students can enroll"
    ON public.course_enrollments FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can read enrollments"
    ON public.course_enrollments FOR SELECT TO authenticated
    USING (auth.uid() = student_id);

CREATE POLICY "Lecturers can read enrollments"
    ON public.course_enrollments FOR SELECT TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

-- ── 3. INQUIRY MESSAGES table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inquiry_messages (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id  uuid        NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
    sender_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_role text        NOT NULL CHECK (sender_role IN ('student', 'lecturer')),
    content     text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can message own inquiries" ON public.inquiry_messages;
DROP POLICY IF EXISTS "Lecturers can reply to inquiries"   ON public.inquiry_messages;
DROP POLICY IF EXISTS "Students can read own messages"     ON public.inquiry_messages;
DROP POLICY IF EXISTS "Lecturers can read all messages"    ON public.inquiry_messages;

CREATE POLICY "Students can message own inquiries"
    ON public.inquiry_messages FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.inquiries
            WHERE id = inquiry_id AND student_id = auth.uid()
        )
    );

CREATE POLICY "Lecturers can reply to inquiries"
    ON public.inquiry_messages FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer'
    );

CREATE POLICY "Students can read own messages"
    ON public.inquiry_messages FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.inquiries
            WHERE id = inquiry_id AND student_id = auth.uid()
        )
    );

CREATE POLICY "Lecturers can read all messages"
    ON public.inquiry_messages FOR SELECT TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

-- ── 4. Fix inquiries RLS — students must be able to INSERT their own rows ─────
DROP POLICY IF EXISTS "Students can insert inquiries"            ON public.inquiries;
DROP POLICY IF EXISTS "Students can insert their own inquiries"  ON public.inquiries;
DROP POLICY IF EXISTS "Students can insert inquiry"              ON public.inquiries;

CREATE POLICY "Students can insert inquiries"
    ON public.inquiries FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Make sure students can also SELECT their own inquiries
DROP POLICY IF EXISTS "Students can read own inquiries" ON public.inquiries;
CREATE POLICY "Students can read own inquiries"
    ON public.inquiries FOR SELECT TO authenticated
    USING (
        auth.uid() = student_id
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer'
    );

-- ── 5. Enable Realtime on inquiry_messages ────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiry_messages;

-- ── 6. Verify ─────────────────────────────────────────────────────────────────
SELECT table_name,
       (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.table_name) AS policies
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('courses','course_enrollments','inquiry_messages','inquiries')
ORDER BY table_name;
