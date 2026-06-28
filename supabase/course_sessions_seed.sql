-- ================================
-- Course Sessions Seed Data
-- Populates the course_sessions table with sample schedule data
-- ================================

-- Clear existing course sessions
DELETE FROM public.course_sessions;

-- ================================
-- CS Level 100 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('GSOT 103', 'Monday', '9:00 AM', 'LS 104'),
('GSOT 105', 'Monday', '11:00 AM', 'LS 111'),
('GSOT 101', 'Tuesday', '9:00 AM', 'LS 104'),
('GBUS 102', 'Tuesday', '11:00 AM', 'E 101'),
('GBUS 101', 'Wednesday', '9:00 AM', 'E 104'),
('GBUS 201', 'Wednesday', '11:00 AM', 'E 101'),
('GSOT 106', 'Thursday', '9:00 AM', 'LS 111'),
('GSOT 102', 'Thursday', '11:00 AM', 'LS 104'),
('GBUS 202', 'Friday', '9:00 AM', 'E 104');

-- ================================
-- CS Level 200 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('GSOT 201', 'Monday', '1:00 PM', 'LS 104'),
('GSOT 203', 'Monday', '3:00 PM', 'LS 111'),
('GSOT 205', 'Tuesday', '1:00 PM', 'GB 210'),
('GSOT 207', 'Tuesday', '3:00 PM', 'LS 104'),
('GBUS 205', 'Wednesday', '1:00 PM', 'E 101'),
('GSOT 202', 'Wednesday', '3:00 PM', 'LS 111'),
('GSOT 204', 'Thursday', '1:00 PM', 'GB 303'),
('CSCI 202', 'Thursday', '3:00 PM', 'Consultancy 1 (CS 101)'),
('GSOT 208', 'Friday', '1:00 PM', 'LS 104'),
('GSOT 210', 'Friday', '3:00 PM', 'GB 303');

-- ================================
-- CS Level 300 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('CSCI 301', 'Monday', '9:00 AM', 'LS 111'),
('GSOT 303', 'Monday', '11:00 AM', 'LS 104'),
('GSOT 305', 'Tuesday', '9:00 AM', 'LS 111'),
('GSOT 301', 'Tuesday', '11:00 AM', 'GB 210'),
('CSCI 303', 'Wednesday', '9:00 AM', 'LS 104'),
('CSCI 305', 'Wednesday', '11:00 AM', 'GB 303'),
('CSCI 302', 'Thursday', '9:00 AM', 'LS 111'),
('CSCI 304', 'Thursday', '11:00 AM', 'E 202'),
('GSOT 304', 'Friday', '9:00 AM', 'LS 104'),
('GSOT 306', 'Friday', '11:00 AM', 'LS 111'),
('GSOT 302', 'Saturday', '9:00 AM', 'E 107'),
('CSC 306', 'Saturday', '11:00 AM', 'GB 210');

-- ================================
-- CS Level 400 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('CSCI 401', 'Monday', '1:00 PM', 'LS 104'),
('GSOT 403', 'Monday', '3:00 PM', 'E 101'),
('CSCI 403', 'Tuesday', '1:00 PM', 'LS 111'),
('GSOT 400', 'Tuesday', '3:00 PM', 'GB 210'),
('GSOT 402', 'Wednesday', '1:00 PM', 'E 202'),
('CSCI 402', 'Wednesday', '3:00 PM', 'LS 104'),
('CSCI 404', 'Thursday', '1:00 PM', 'GB 303'),
('CSCI 406', 'Thursday', '3:00 PM', 'LS 111');

-- ================================
-- IT Level 100 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('GBUS 102', 'Monday', '9:00 AM', 'E 101'),
('GSOT 105', 'Monday', '11:00 AM', 'LS 104'),
('GBUS 101', 'Tuesday', '9:00 AM', 'E 104'),
('GSOT 101', 'Tuesday', '11:00 AM', 'LS 111'),
('GSOT 103', 'Wednesday', '9:00 AM', 'LS 104'),
('GBUS 201', 'Wednesday', '11:00 AM', 'E 101'),
('GSOT 106', 'Thursday', '9:00 AM', 'LS 111'),
('GSOT 102', 'Thursday', '11:00 AM', 'LS 104'),
('GBUS 202', 'Friday', '9:00 AM', 'E 104');

-- ================================
-- IT Level 200 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('GSOT 205', 'Monday', '1:00 PM', 'GB 210'),
('GSOT 203', 'Monday', '3:00 PM', 'LS 104'),
('GSOT 201', 'Tuesday', '1:00 PM', 'LS 111'),
('GSOT 207', 'Tuesday', '3:00 PM', 'LS 104'),
('GBUS 205', 'Wednesday', '1:00 PM', 'E 101'),
('GSOT 208', 'Wednesday', '3:00 PM', 'GB 303'),
('GSOT 202', 'Thursday', '1:00 PM', 'LS 111'),
('GSOT 204', 'Thursday', '3:00 PM', 'GB 303'),
('ICTE 201', 'Friday', '1:00 PM', 'Consultancy 1 (CS 101)'),
('GSOT 210', 'Friday', '3:00 PM', 'GB 303');

-- ================================
-- IT Level 300 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('ICTE 301', 'Monday', '9:00 AM', 'LS 104'),
('ICTE 305', 'Monday', '11:00 AM', 'LS 111'),
('GSOT 305', 'Tuesday', '9:00 AM', 'LS 104'),
('GSOT 301', 'Tuesday', '11:00 AM', 'GB 210'),
('GSOT 303', 'Wednesday', '9:00 AM', 'LS 111'),
('GSOT 302', 'Wednesday', '11:00 AM', 'E 202'),
('GSOT 306', 'Thursday', '9:00 AM', 'LS 104'),
('ICTE 303', 'Thursday', '11:00 AM', 'E 101'),
('ICTE 304', 'Friday', '9:00 AM', 'GB 303');

-- ================================
-- IT Level 400 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('GSOT 403', 'Monday', '1:00 PM', 'E 101'),
('GSOT 401', 'Monday', '3:00 PM', 'LS 104'),
('GSOT 406', 'Tuesday', '1:00 PM', 'GB 210'),
('ICTE 402', 'Tuesday', '3:00 PM', 'LS 111'),
('GSOT 404', 'Wednesday', '1:00 PM', 'LS 104'),
('ICTE 406', 'Wednesday', '3:00 PM', 'GB 303');

-- ================================
-- IT Electives Level 400 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('GSOT 420', 'Thursday', '5:00 PM', 'LS 111'),
('GSOT 430', 'Friday', '5:00 PM', 'E 202'),
('ICTE 410', 'Saturday', '9:00 AM', 'Consultancy 1 (CS 101)'),
('ICTE 420', 'Saturday', '11:00 AM', 'GB 210');

-- ================================
-- CS Electives Level 400 Sessions
-- ================================
INSERT INTO public.course_sessions (course_code, day, time_slot, location) VALUES
('CSCI 420', 'Thursday', '5:00 PM', 'GB 303'),
('GSOT 430', 'Friday', '5:00 PM', 'E 202'),
('GSOT 420', 'Saturday', '9:00 AM', 'LS 104'),
('CSCI 440', 'Saturday', '11:00 AM', 'LS 111'),
('ICTE 302', 'Saturday', '1:00 PM', 'E 101');

-- Verify
SELECT course_code, day, time_slot, location FROM public.course_sessions ORDER BY course_code, day, time_slot;
