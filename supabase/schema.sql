-- ================================
-- UniAssist – Supabase SQL Setup
-- Run this in: Supabase Dashboard → SQL Editor
-- ================================

-- 1. Inquiries (student questions submitted to lecturers)
create table if not exists public.inquiries (
    id          uuid primary key default gen_random_uuid(),
    student_id  uuid references auth.users on delete cascade,
    course      text not null,
    question    text not null,
    status      text not null default 'GENERAL' check (status in ('GENERAL', 'URGENT', 'RESOLVED')),
    created_at  timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.inquiries enable row level security;

-- Students can insert their own inquiries
create policy "Students can insert inquiries"
    on public.inquiries for insert
    with check (auth.uid() = student_id);

-- Lecturers (any authenticated user whose metadata role = 'lecturer') can read all inquiries
create policy "Lecturers can read inquiries"
    on public.inquiries for select
    using (
        auth.uid() = student_id
        or (auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer'
    );

create policy "Lecturers can update inquiries"
    on public.inquiries for update
    using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer')
    with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

-- ================================

-- 2. Chat messages (per-user AI chat history)
create table if not exists public.chat_messages (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users on delete cascade,
    sender      text not null check (sender in ('user', 'ai')),
    content     text not null,
    created_at  timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.chat_messages enable row level security;

-- Users can only see and insert their own messages
create policy "Users manage own messages"
    on public.chat_messages for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ================================

-- 3. Course Outlines (Lecturers manage, Students view)
create table if not exists public.course_outlines (
    course_code text primary key,
    title       text not null,
    lecturer    text not null,
    lecturer_id uuid references auth.users(id) on delete set null,
    outline     text not null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.course_outlines enable row level security;

-- Anyone authenticated can read course outlines
create policy "Anyone can read course outlines"
    on public.course_outlines for select
    to authenticated
    using (true);

-- Only lecturers can insert or update outlines
create policy "Lecturers can insert/update outlines"
    on public.course_outlines for all
    using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer')
    with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

-- ================================

-- 4. Students
create table if not exists public.students (
    id          uuid primary key references auth.users on delete cascade,
    full_name   text not null,
    email       text not null,
    department  text not null,
    level       text not null,
    index_number text,
    created_at  timestamptz not null default now()
);

-- Enable RLS
alter table public.students enable row level security;

-- Users can read their own data, lecturers can read all
create policy "Users can read own student record"
    on public.students for select
    using (
        auth.uid() = id
        or (auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer'
    );

create policy "Users can insert own student record"
    on public.students for insert
    with check (auth.uid() = id);

create policy "Users can update own student record"
    on public.students for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- ================================

-- 5. Courses (department, level, code, name)
create table if not exists public.courses (
    id          uuid primary key default gen_random_uuid(),
    department  text not null,
    level       text not null,
    code        text not null unique,
    name        text not null,
    description text,
    created_at  timestamptz not null default now()
);

alter table public.courses enable row level security;

-- Anyone authenticated can read courses
create policy "Anyone can read courses"
    on public.courses for select
    to authenticated
    using (true);

-- Only lecturers can manage courses
create policy "Lecturers manage courses"
    on public.courses for all
    using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer')
    with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

-- ================================

-- 6. Course Sessions for Timetable
create table if not exists public.course_sessions (
    id          uuid primary key default gen_random_uuid(),
    course_code text references public.courses(code) on delete cascade,
    day         text not null,
    time_slot   text not null,
    location    text not null,
    created_at  timestamptz not null default now()
);

alter table public.course_sessions enable row level security;

create policy "Anyone can read sessions"
    on public.course_sessions for select
    to authenticated
    using (true);

create policy "Lecturers manage sessions"
    on public.course_sessions for all
    using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer')
    with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

-- ================================

-- 7. Announcements (campus-wide alerts, events, news)
create table if not exists public.announcements (
    id          uuid primary key default gen_random_uuid(),
    type        text not null default 'General' check (type in ('Urgent', 'Event', 'Academic', 'Social', 'General')),
    title       text not null,
    content     text not null,
    color       text not null default '#3b82f6',
    created_at  timestamptz not null default now()
);

alter table public.announcements enable row level security;

-- Anyone authenticated can read announcements
create policy "Anyone can read announcements"
    on public.announcements for select
    to anon, authenticated
    using (true);

-- Only lecturers/admins can manage announcements
create policy "Lecturers manage announcements"
    on public.announcements for all
    using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer')
    with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

-- ================================
-- SEED DATA: Announcements
-- ================================

insert into public.announcements (type, title, content, color) values
    ('Urgent', 'GIMPA Library Extended Hours', 'The GIMPA main library will operate 24/7 during the upcoming examination period starting this Monday. All students are encouraged to utilize the extended hours for revision.', '#ef4444'),
    ('Event', 'GIMPA Tech Career Fair 2026', 'Over 30 companies including MTN, Vodafone Ghana, and Andela will be attending the annual GIMPA Tech Career Fair on May 10th at the Executive Conference Centre. Register now!', '#3b82f6'),
    ('Academic', 'Mid-Semester Results Released', 'Mid-semester examination results for all departments are now available on the student portal. Please check your results and contact your HOD for any discrepancies.', '#10b981'),
    ('Social', 'SRC Elections - Vote Now', 'Student Representative Council elections are open. Cast your vote at the Administration Block between 8:00 AM and 5:00 PM today.', '#8b5cf6'),
    ('General', 'Campus Wi-Fi Maintenance', 'Scheduled maintenance on the campus Wi-Fi network this Saturday from 12:00 AM to 6:00 AM. Please plan accordingly.', '#f59e0b');

-- ================================
-- 8. Emergency Contacts
-- ================================

create table if not exists public.emergency_contacts (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    subtitle    text not null default '',
    phone       text not null,
    email       text,
    category    text not null default 'General',
    sort_order  int not null default 0,
    created_at  timestamptz not null default now()
);

alter table public.emergency_contacts enable row level security;

create policy "Anyone can read emergency contacts"
    on public.emergency_contacts for select
    to authenticated
    using (true);

-- ================================
-- 9. AI Knowledge Base (Handbook-backed answers)
-- ================================

create table if not exists public.ai_knowledge (
    id          uuid primary key default gen_random_uuid(),
    source      text not null,
    section     text not null,
    content     text not null,
    tags        text[] not null default '{}',
    created_at  timestamptz not null default now()
);

alter table public.ai_knowledge enable row level security;

create policy "Anyone can read ai knowledge"
    on public.ai_knowledge for select
    to authenticated
    using (true);

create policy "Lecturers manage ai knowledge"
    on public.ai_knowledge for all
    using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer')
    with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');

insert into public.ai_knowledge (source, section, content, tags) values
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '5.0 Orientation',
        'Orientation is compulsory for all fresh students. Absence from orientation may result in withdrawal of admission.',
        array['orientation', 'fresh students', 'admission']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '7.0 Statute of Limitation',
        'For full-time programmes, the maximum completion period generally equals programme duration plus two years. For part-time programmes, it generally equals duration plus four years.',
        array['statute of limitation', 'completion period', 'full-time', 'part-time']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '9.1 Maximum Course Load',
        'The maximum course load for undergraduate programmes is 21 credit hours per week unless otherwise determined by programme requirements.',
        array['course load', 'credit hours', 'maximum']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '9.3 Scoring and Weighting',
        'Undergraduate taught courses are weighted as 60% examination and 40% continuous assessment.',
        array['grading', 'scoring', 'continuous assessment', 'exam']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '9.6 Grading',
        'The handbook grading scale includes A+ (80-100), A (70-79), B+ (65-69), B (60-64), C+ (55-59), C (50-54), D+ (45-49), D (40-44), and F (0-39).',
        array['grade', 'grading', 'a+', 'f']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '9.6 Good Standing',
        'Students who fail two courses or have two cumulated retakes are placed on academic probation. Failing three or more courses in a semester may require repeating that semester.',
        array['probation', 'good standing', 'failed courses']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '10.3 Withdrawal',
        'A student may apply to withdraw at any time during the semester/modular/session. Tuition fee refunds for permanent withdrawals are subject to section 15.2 rules.',
        array['withdrawal', 'deferment', 'refund']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '11.1 Graduation Requirements',
        'To qualify for an undergraduate award, a student must pass all approved required courses and earn the required minimum credits approved for the programme.',
        array['graduation', 'credits', 'degree']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '11.2 Application to Graduate',
        'Students must apply to graduate (whether attending ceremony or not). Missing the application timeline means the student does not graduate in that academic year.',
        array['graduate', 'application', 'deadline']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '12.3 Eligibility for Examinations',
        'A student is eligible for examinations only if they are registered for the course, have fully paid fees, have at least 75% attendance, and have completed continuous assessment requirements.',
        array['exam eligibility', 'attendance', 'fees', 'registration']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '12.4 Re-sit',
        'Students who fail may be allowed one reassessment (re-sit) at a fee, subject to approval. Re-sit is not automatic and requires prior registration and first attempt in the course.',
        array['re-sit', 'supplementary', 'failed course']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '12.8 Attendance at Examinations',
        'Students may be refused admission if more than 30 minutes late, must present student ID, and may receive zero for absence without accepted extenuating circumstances.',
        array['exam attendance', 'late', 'id card', 'absence']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '12.13 Publication of Results',
        'Examination results are published through the student portal. Feedback and re-mark requests must be submitted within seven calendar days, with re-mark requiring fee payment.',
        array['results', 'remark', 'feedback', 'student portal']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '14.1 Library',
        'Library resources include hard-copy and electronic materials. Library hours are posted at the library entrance and on the library webpages.',
        array['library', 'hours', 'electronic resources']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '14.4 Health and Clinic Services',
        'Every fresh student is expected to undergo compulsory medical screening at GIMPA Clinic within the scheduled period.',
        array['clinic', 'medical screening', 'health']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '15.2 Tuition Fee Refunds',
        'Refund requests must be in writing and generally within 28 days of semester start (or 14 days for modular/session). Commitment fees are not refundable for fresh students.',
        array['tuition refund', 'fees', 'withdrawal', 'commitment fee']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '15.3 Student Loan Trust Fund',
        'SLTF loans are available to Ghanaian students enrolled in degree programmes and in good academic standing, subject to SLTF eligibility criteria.',
        array['sltf', 'loan', 'financial aid']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '15.4 Financial Aid',
        'Financial aid may include scholarships, work study, and loans, depending on available resources and eligibility criteria.',
        array['financial aid', 'scholarship', 'work study']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '19.0 Disciplinary Procedure',
        'Disciplinary procedures include written complaints, investigation by the Student Affairs Committee, hearing rights, and the respondent’s right to an adviser.',
        array['discipline', 'hearing', 'student affairs committee']
    ),
    (
        'SB-JUNE-2-2023-HANDBOOK-Undergrad-programme.pdf',
        '20.0 Sanctions',
        'Sanctions framework includes reprimand, warning, suspension, and dismissal, with escalation based on severity and repeated offences.',
        array['sanctions', 'warning', 'suspension', 'dismissal']
    );
