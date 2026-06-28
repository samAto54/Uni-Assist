-- Uni-Assist QA remediation — run in Supabase SQL Editor

-- ── 1. Courses: add description column ───────────────────────────────────────
alter table public.courses
add column if not exists description text;

update public.courses
set description = name
where description is null;

-- ── 2. Announcements: allow anonymous read (visitor mode) ────────────────────
drop policy if exists "Anyone can read announcements" on public.announcements;

create policy "Anyone can read announcements"
    on public.announcements for select
    to anon, authenticated
    using (true);

-- ── 3. Emergency contacts directory ──────────────────────────────────────────
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

drop policy if exists "Anyone can read emergency contacts" on public.emergency_contacts;

create policy "Anyone can read emergency contacts"
    on public.emergency_contacts for select
    to authenticated
    using (true);

-- Seed canonical GIMPA emergency contacts (skip if already seeded)
insert into public.emergency_contacts (name, subtitle, phone, email, category, sort_order)
select * from (values
    ('GIMPA Security',              '24/7 Campus Patrol & Assistance',     '030-274-6882', 'security@gimpa.edu.gh',   'Security',  1),
    ('University Medical Centre',   'Urgent Care & First Aid',             '030-274-6001', 'clinic@gimpa.edu.gh',     'Medical',   2),
    ('Registrar''s Office',        'Academic records & enrollment',       '030-274-6000', 'registrar@gimpa.edu.gh',  'Academic',  3),
    ('Student Welfare Office',    'Counseling & crisis support',         '030-274-6830', 'welfare@gimpa.edu.gh',    'Welfare',   4)
) as v(name, subtitle, phone, email, category, sort_order)
where not exists (select 1 from public.emergency_contacts limit 1);

-- ── 4. Inquiries: allow lecturers to mark as resolved ─────────────────────────
drop policy if exists "Lecturers can update inquiries" on public.inquiries;

create policy "Lecturers can update inquiries"
    on public.inquiries for update
    using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer')
    with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'lecturer');
