-- =============================================
-- Fix: Allow same course code in different departments
-- (many GSOT/GBUS courses are shared between CS and IT)
-- =============================================
ALTER TABLE public.course_sessions DROP CONSTRAINT IF EXISTS course_sessions_course_code_fkey;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_code_key;
ALTER TABLE public.courses ADD CONSTRAINT courses_code_dept_unique UNIQUE (code, department);

-- Clear existing course data
DELETE FROM public.course_sessions;
DELETE FROM public.courses;

-- =============================================
-- BSc Information & Communication Technology (IT)
-- =============================================

-- IT Level 100
INSERT INTO public.courses (department, level, code, name) VALUES
('it', '100', 'GBUS 102', 'Economic Science'),
('it', '100', 'GSOT 105', 'Fundamentals of Computing'),
('it', '100', 'GBUS 101', 'Communication Skills I'),
('it', '100', 'GSOT 101', 'Calculus I'),
('it', '100', 'GSOT 103', 'Programming Fundamentals'),
('it', '100', 'GBUS 201', 'Accounting Foundations'),
('it', '100', 'GSOT 106', 'Object-Oriented Programming I'),
('it', '100', 'GSOT 102', 'Calculus II'),
('it', '100', 'GBUS 202', 'Communication Skills II');

-- IT Level 200
INSERT INTO public.courses (department, level, code, name) VALUES
('it', '200', 'GSOT 205', 'Object Oriented Programming II'),
('it', '200', 'GSOT 203', 'System Analysis and Design'),
('it', '200', 'GSOT 201', 'Discrete Mathematics'),
('it', '200', 'GSOT 207', 'Computer Org. & Architecture'),
('it', '200', 'GBUS 205', 'Management and Org. Behaviour'),
('it', '200', 'GSOT 208', 'Linear Algebra'),
('it', '200', 'GSOT 202', 'Web Technologies'),
('it', '200', 'GSOT 204', 'Probabilities & Statistics'),
('it', '200', 'ICTE 201', 'Database Design I'),
('it', '200', 'GSOT 210', 'Electronic Circuits');

-- IT Level 300
INSERT INTO public.courses (department, level, code, name) VALUES
('it', '300', 'ICTE 301', 'IT Research Methods'),
('it', '300', 'ICTE 305', 'Database Design II'),
('it', '300', 'GSOT 305', 'Data Communication & Networks'),
('it', '300', 'GSOT 301', 'Mobile Programming'),
('it', '300', 'GSOT 303', 'Operating Systems'),
('it', '300', 'GSOT 302', 'Human Computer Interaction'),
('it', '300', 'GSOT 306', 'Advanced Data Communication & Networks'),
('it', '300', 'ICTE 303', 'IT Project Management'),
('it', '300', 'ICTE 304', 'Systems Administration');

-- IT Level 400
INSERT INTO public.courses (department, level, code, name) VALUES
('it', '400', 'GSOT 403', 'Ethical & Legal Issues in Computing'),
('it', '400', 'GSOT 401', 'Management Information Systems'),
('it', '400', 'GSOT 406', 'Project I'),
('it', '400', 'ICTE 402', 'Electronic Business'),
('it', '400', 'GSOT 404', 'Computer & Information Security'),
('it', '400', 'ICTE 406', 'Project II');

-- IT Electives (Level 400)
INSERT INTO public.courses (department, level, code, name) VALUES
('it', '400', 'GSOT 420', 'Wireless Networks'),
('it', '400', 'GSOT 430', 'Data Warehousing and Mining'),
('it', '400', 'ICTE 410', 'Information Technology Auditing'),
('it', '400', 'ICTE 420', 'Advanced Database Design');

-- =============================================
-- BSc Computer Science (CS)
-- =============================================

-- CS Level 100
INSERT INTO public.courses (department, level, code, name) VALUES
('cs', '100', 'GSOT 103', 'Programming Fundamentals'),
('cs', '100', 'GSOT 105', 'Fundamentals of Computing'),
('cs', '100', 'GSOT 101', 'Calculus I'),
('cs', '100', 'GBUS 102', 'Economic Science'),
('cs', '100', 'GBUS 101', 'Communication Skills'),
('cs', '100', 'GBUS 201', 'Accounting Foundations'),
('cs', '100', 'GSOT 106', 'Object-Oriented Programming I'),
('cs', '100', 'GSOT 102', 'Calculus II'),
('cs', '100', 'GBUS 202', 'Communication Skills II');

-- CS Level 200
INSERT INTO public.courses (department, level, code, name) VALUES
('cs', '200', 'GSOT 201', 'Discrete Mathematics'),
('cs', '200', 'GSOT 203', 'System Analysis and Design'),
('cs', '200', 'GSOT 205', 'Object Oriented Programming II'),
('cs', '200', 'GSOT 207', 'Computer Org. and Architecture'),
('cs', '200', 'GBUS 205', 'Management and Org. Behaviour'),
('cs', '200', 'GSOT 202', 'Web Technologies'),
('cs', '200', 'GSOT 204', 'Probability and Statistics'),
('cs', '200', 'CSCI 202', 'Database Systems'),
('cs', '200', 'GSOT 208', 'Linear Algebra'),
('cs', '200', 'GSOT 210', 'Electronic Circuits');

-- CS Level 300
INSERT INTO public.courses (department, level, code, name) VALUES
('cs', '300', 'CSCI 301', 'Computing Theory'),
('cs', '300', 'GSOT 303', 'Operating Systems'),
('cs', '300', 'GSOT 305', 'Data Communication & Networks'),
('cs', '300', 'GSOT 301', 'Mobile Programming'),
('cs', '300', 'CSCI 303', 'Data Structures and Algorithms'),
('cs', '300', 'CSCI 305', 'Advanced Probability & Statistics'),
('cs', '300', 'CSCI 302', 'Systems Modelling & Simulation'),
('cs', '300', 'CSCI 304', 'Numerical Methods'),
('cs', '300', 'GSOT 304', 'Software Engineering'),
('cs', '300', 'GSOT 306', 'Adv Data Communication & Networks'),
('cs', '300', 'GSOT 302', 'Human Computer Interaction'),
('cs', '300', 'CSC 306', 'Adv Data Structures & Algorithms');

-- CS Level 400
INSERT INTO public.courses (department, level, code, name) VALUES
('cs', '400', 'CSCI 401', 'Compiler Design'),
('cs', '400', 'GSOT 403', 'Management Information Systems'),
('cs', '400', 'CSCI 403', 'Computer Graphics'),
('cs', '400', 'GSOT 400', 'Project I'),
('cs', '400', 'GSOT 402', 'Operations Research'),
('cs', '400', 'CSCI 402', 'Survey of Programming Languages'),
('cs', '400', 'CSCI 404', 'Artificial Intelligence'),
('cs', '400', 'CSCI 406', 'Real-Time and Embedded Systems');

-- CS Electives (Level 400)
INSERT INTO public.courses (department, level, code, name) VALUES
('cs', '400', 'CSCI 420', 'Parallel & Distributed Systems'),
('cs', '400', 'GSOT 430', 'Data Warehousing and Mining'),
('cs', '400', 'GSOT 420', 'Wireless Networks'),
('cs', '400', 'CSCI 440', 'Robotics'),
('cs', '400', 'ICTE 302', 'IT Project Management');
