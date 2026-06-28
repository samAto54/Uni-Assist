-- ================================
-- GIMPA Classroom Locations for AI Knowledge Base
-- Maps course codes to specific room locations for answering "Where is my class?" questions
-- ================================

insert into public.ai_knowledge (source, section, content, tags) values
-- BUILDING CODES REFERENCE
(
    'GIMPA-Classroom-Locations',
    'Building Code: LS',
    'LS stands for Lecture Hall/Block. Rooms with LS prefix (e.g., LS 104, LS 111) are located in the main lecture halls on the Greenhill campus.',
    array['classroom', 'building code', 'LS', 'lecture hall', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'Building Code: GB',
    'GB stands for Graduate Block. Rooms with GB prefix (e.g., GB 210) are located in the Graduate Lecture Block on the Greenhill campus, used primarily for postgraduate courses.',
    array['classroom', 'building code', 'GB', 'graduate block', 'postgraduate', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'Building Code: E',
    'E stands for Education Block. Rooms with E prefix (e.g., E 101, E 104) are located in the Education Block building on the Greenhill campus.',
    array['classroom', 'building code', 'E', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'Building Code: L2',
    'L2 stands for Level 2. Rooms with L2 prefix (e.g., L2 GF2) are located on the second floor of a building. GF2 specifically means Ground Floor, Room 2 on Level 2.',
    array['classroom', 'building code', 'L2', 'level 2', 'location']
),

-- COURSE-SPECIFIC LOCATIONS - TECHNOLOGY COURSES
(
    'GIMPA-Classroom-Locations',
    'SOT702B - IS RESEARCH METHODS',
    'IS RESEARCH METHODS (SOT702B) is held in LS 104 (Lecture Hall 104) on the Greenhill campus.',
    array['classroom', 'SOT702B', 'IS RESEARCH METHODS', 'LS 104', 'lecture hall', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT704B - NETWORKS AND TELECOMMUNICATIONS',
    'NETWORKS AND TELECOMMUNICATIONS (SOT704B) is held in LS 104 (Lecture Hall 104) on the Greenhill campus.',
    array['classroom', 'SOT704B', 'NETWORKS AND TELECOMMUNICATIONS', 'LS 104', 'lecture hall', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT711B - DATA WAREHOUSING',
    'DATA WAREHOUSING (SOT711B) is held in LS 111 (Lecture Hall 111) on the Greenhill campus.',
    array['classroom', 'SOT711B', 'DATA WAREHOUSING', 'LS 111', 'lecture hall', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT713B - E-BUSINESS',
    'E-BUSINESS (SOT713B) is held in LS 111 (Lecture Hall 111) on the Greenhill campus. Some sessions may be in L2 GF2 (Level 2, Ground Floor Room 2).',
    array['classroom', 'SOT713B', 'E-BUSINESS', 'LS 111', 'L2 GF2', 'lecture hall', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT714B - BUSINESS INTELLIGENCE AND DATA MINING',
    'BUSINESS INTELLIGENCE AND DATA MINING (SOT714B) is held in LS 111 (Lecture Hall 111) on the Greenhill campus.',
    array['classroom', 'SOT714B', 'BUSINESS INTELLIGENCE AND DATA MINING', 'LS 111', 'lecture hall', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT707B - DATABASE AND PROGRAMMING CONCEPTS',
    'DATABASE AND PROGRAMMING CONCEPTS (SOT707B) is held in LS 111 (Lecture Hall 111) on the Greenhill campus.',
    array['classroom', 'SOT707B', 'DATABASE AND PROGRAMMING CONCEPTS', 'LS 111', 'lecture hall', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT021B - FUNDAMENTALS OF WEB TECHNOLOGY AND INTERNET PROGRAMMING',
    'FUNDAMENTALS OF WEB TECHNOLOGY AND INTERNET PROGRAMMING (SOT021B) location is TBA (To Be Announced). Check the official schedule for updates.',
    array['classroom', 'SOT021B', 'FUNDAMENTALS OF WEB TECHNOLOGY AND INTERNET PROGRAMMING', 'TBA', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT019B - COMPUTING PROJECT MANAGEMENT',
    'COMPUTING PROJECT MANAGEMENT (SOT019B) location is TBA (To Be Announced). Check the official schedule for updates.',
    array['classroom', 'SOT019B', 'COMPUTING PROJECT MANAGEMENT', 'TBA', 'location']
),

-- COURSE-SPECIFIC LOCATIONS - LAW/ITL COURSES
(
    'GIMPA-Classroom-Locations',
    'ITL706 - Intelligent Systems for Legal and Administrative Applications',
    'Intelligent Systems for Legal and Administrative Applications (ITL706) is held in GB 210 (Graduate Block, Room 210) on the Greenhill campus.',
    array['classroom', 'ITL706', 'Intelligent Systems for Legal and Administrative Applications', 'GB 210', 'graduate block', 'location']
),

-- COURSE-SPECIFIC LOCATIONS - BUSINESS SCHOOL COURSES
(
    'GIMPA-Classroom-Locations',
    'BUS407B - TAXATION AND TAX ADMINISTRATION',
    'TAXATION AND TAX ADMINISTRATION (BUS407B) is held in E 104 (Education Block, Room 104) on the Greenhill campus.',
    array['classroom', 'BUS407B', 'TAXATION AND TAX ADMINISTRATION', 'E 104', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SPG406B - CURRENT ISSUES IN PUBLIC SECTOR MGT',
    'CURRENT ISSUES IN PUBLIC SECTOR MGT (SPG406B) is held in E 104 (Education Block, Room 104) on the Greenhill campus.',
    array['classroom', 'SPG406B', 'CURRENT ISSUES IN PUBLIC SECTOR MGT', 'E 104', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SPG405B - STRATEGIC MANAGEMENT',
    'STRATEGIC MANAGEMENT (SPG405B) is held in LS 104 (Lecture Hall 104) on the Greenhill campus.',
    array['classroom', 'SPG405B', 'STRATEGIC MANAGEMENT', 'LS 104', 'lecture hall', 'location']
),

-- COURSE-SPECIFIC LOCATIONS - LIBERAL ARTS/LAW COURSES
(
    'GIMPA-Classroom-Locations',
    'LAS202B - COMMUNICATION II',
    'COMMUNICATION II (LAS202B) is held in E 104 (Education Block, Room 104) on the Greenhill campus.',
    array['classroom', 'LAS202B', 'COMMUNICATION II', 'E 104', 'education block', 'location']
),

-- COURSE-SPECIFIC LOCATIONS - PUBLIC ADMINISTRATION COURSES
(
    'GIMPA-Classroom-Locations',
    'SPG304B - WAGES AND SALARIES ADMIN.',
    'WAGES AND SALARIES ADMIN. (SPG304B) is held in E 101 (Education Block, Room 101) on the Greenhill campus.',
    array['classroom', 'SPG304B', 'WAGES AND SALARIES ADMIN.', 'E 101', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SPG306B - PUBLIC FINANCE',
    'PUBLIC FINANCE (SPG306B) is held in E 101 (Education Block, Room 101) on the Greenhill campus.',
    array['classroom', 'SPG306B', 'PUBLIC FINANCE', 'E 101', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SPG307B - RESEARCH METHODS I',
    'RESEARCH METHODS I (SPG307B) is held in E 101 (Education Block, Room 101) on the Greenhill campus.',
    array['classroom', 'SPG307B', 'RESEARCH METHODS I', 'E 101', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SPG303B - ADMINISTRATIVE AND OFFICE MANAGEMENT',
    'ADMINISTRATIVE AND OFFICE MANAGEMENT (SPG303B) is held in E 101 (Education Block, Room 101) on the Greenhill campus.',
    array['classroom', 'SPG303B', 'ADMINISTRATIVE AND OFFICE MANAGEMENT', 'E 101', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SPG305B - LEADERSHIP ETHICS AND SOCIAL RESP.',
    'LEADERSHIP ETHICS AND SOCIAL RESP. (SPG305B) is held in E 101 (Education Block, Room 101) on the Greenhill campus.',
    array['classroom', 'SPG305B', 'LEADERSHIP ETHICS AND SOCIAL RESP.', 'E 101', 'education block', 'location']
),

-- ROOM SUMMARY BY BUILDING
(
    'GIMPA-Classroom-Locations',
    'LS 104 - Lecture Hall 104',
    'LS 104 (Lecture Hall 104) hosts multiple courses including: IS RESEARCH METHODS (SOT702B), NETWORKS AND TELECOMMUNICATIONS (SOT704B), and STRATEGIC MANAGEMENT (SPG405B).',
    array['classroom', 'LS 104', 'lecture hall', 'SOT702B', 'SOT704B', 'SPG405B', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'LS 111 - Lecture Hall 111',
    'LS 111 (Lecture Hall 111) hosts multiple courses including: DATA WAREHOUSING (SOT711B), E-BUSINESS (SOT713B), BUSINESS INTELLIGENCE AND DATA MINING (SOT714B), and DATABASE AND PROGRAMMING CONCEPTS (SOT707B).',
    array['classroom', 'LS 111', 'lecture hall', 'SOT711B', 'SOT713B', 'SOT714B', 'SOT707B', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'GB 210 - Graduate Block Room 210',
    'GB 210 (Graduate Block, Room 210) hosts: Intelligent Systems for Legal and Administrative Applications (ITL706).',
    array['classroom', 'GB 210', 'graduate block', 'ITL706', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'E 101 - Education Block Room 101',
    'E 101 (Education Block, Room 101) hosts multiple courses including: WAGES AND SALARIES ADMIN. (SPG304B), PUBLIC FINANCE (SPG306B), RESEARCH METHODS I (SPG307B), ADMINISTRATIVE AND OFFICE MANAGEMENT (SPG303B), and LEADERSHIP ETHICS AND SOCIAL RESP. (SPG305B).',
    array['classroom', 'E 101', 'education block', 'SPG304B', 'SPG306B', 'SPG307B', 'SPG303B', 'SPG305B', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'E 104 - Education Block Room 104',
    'E 104 (Education Block, Room 104) hosts multiple courses including: TAXATION AND TAX ADMINISTRATION (BUS407B), CURRENT ISSUES IN PUBLIC SECTOR MGT (SPG406B), and COMMUNICATION II (LAS202B).',
    array['classroom', 'E 104', 'education block', 'BUS407B', 'SPG406B', 'LAS202B', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'L2 GF2 - Level 2 Ground Floor Room 2',
    'L2 GF2 (Level 2, Ground Floor Room 2) is used for some sessions of E-BUSINESS (SOT713B).',
    array['classroom', 'L2 GF2', 'level 2', 'SOT713B', 'location']
),

-- GENERAL CLASSROOM LOCATION HELP
(
    'GIMPA-Classroom-Locations',
    'Finding Your Classroom',
    'To find your classroom, check your course code against this knowledge base. Building codes: LS = Lecture Hall, GB = Graduate Block, E = Education Block, L2 = Level 2. All classrooms are on the Greenhill campus. If your course shows TBA, check the official lecture schedule at max-ease-manager.vercel.app for updates.',
    array['classroom', 'finding classroom', 'building codes', 'location help', 'TBA']
),
(
    'GIMPA-Classroom-Locations',
    'TBA - To Be Announced',
    'If your course location shows TBA (To Be Announced), it means the room assignment has not been finalized yet. Check the official lecture schedule at max-ease-manager.vercel.app or contact your department for updates.',
    array['classroom', 'TBA', 'to be announced', 'location help']
),

-- ADDITIONAL COURSES FROM SCHEDULE IMAGES
(
    'GIMPA-Classroom-Locations',
    'SPG204B - POLITICAL AND LEGAL SETTINGS',
    'POLITICAL AND LEGAL SETTINGS (SPG204B) is held in E 107 (Education Block, Room 107) on Tuesdays from 1pm-4pm and Wednesdays from 5pm-8pm on the Greenhill campus.',
    array['classroom', 'SPG204B', 'POLITICAL AND LEGAL SETTINGS', 'E 107', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT320B - MANAGEMENT INFORMATION SYSTEMS',
    'MANAGEMENT INFORMATION SYSTEMS (SOT320B) is held in E 107 (Education Block, Room 107) on Wednesdays from 9am-12pm and in E 202 (Education Block, Room 202) on Fridays from 5pm-8pm on the Greenhill campus.',
    array['classroom', 'SOT320B', 'MANAGEMENT INFORMATION SYSTEMS', 'E 107', 'E 202', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'BUS208B - STATISTICS',
    'STATISTICS (BUS208B) is held in E 202 (Education Block, Room 202) on Tuesdays from 5pm-8pm on the Greenhill campus.',
    array['classroom', 'BUS208B', 'STATISTICS', 'E 202', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SPG205B - DEVELOPMENT OF PUBLIC ADMINISTRATION',
    'DEVELOPMENT OF PUBLIC ADMINISTRATION (SPG205B) is held in E 202 (Education Block, Room 202) on Thursdays from 5pm-8pm on the Greenhill campus.',
    array['classroom', 'SPG205B', 'DEVELOPMENT OF PUBLIC ADMINISTRATION', 'E 202', 'education block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'LAS100B - AFRICAN STUDIES',
    'AFRICAN STUDIES (LAS100B) is held in E 202 (Education Block, Room 202) on Mondays from 5pm-8pm on the Greenhill campus.',
    array['classroom', 'LAS100B', 'AFRICAN STUDIES', 'E 202', 'education block', 'location']
),

-- ADDITIONAL ROOM SUMMARIES
(
    'GIMPA-Classroom-Locations',
    'E 107 - Education Block Room 107',
    'E 107 (Education Block, Room 107) hosts courses including: POLITICAL AND LEGAL SETTINGS (SPG204B) and MANAGEMENT INFORMATION SYSTEMS (SOT320B).',
    array['classroom', 'E 107', 'education block', 'SPG204B', 'SOT320B', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'E 202 - Education Block Room 202',
    'E 202 (Education Block, Room 202) hosts multiple courses including: STATISTICS (BUS208B), DEVELOPMENT OF PUBLIC ADMINISTRATION (SPG205B), AFRICAN STUDIES (LAS100B), POLITICAL AND LEGAL SETTINGS (SPG204B), and MANAGEMENT INFORMATION SYSTEMS (SOT320B).',
    array['classroom', 'E 202', 'education block', 'BUS208B', 'SPG205B', 'LAS100B', 'SPG204B', 'SOT320B', 'location']
),

-- NEW COURSES FROM LATEST SCHEDULE IMAGES
(
    'GIMPA-Classroom-Locations',
    'SOT210B/SOT015B - ELECTRONIC CIRCUITS/DIGITAL ELECTRONICS',
    'ELECTRONIC CIRCUITS/DIGITAL ELECTRONICS (SOT210B/SOT015B) is held in GB 303 (Graduate Block, Room 303) on Thursdays from 9am-12noon.',
    array['classroom', 'SOT210B', 'SOT015B', 'ELECTRONIC CIRCUITS', 'DIGITAL ELECTRONICS', 'GB 303', 'graduate block', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT616B - DATABASE SYSTEMS',
    'DATABASE SYSTEMS (SOT616B) is held in Consultancy 1 (CS 101) on Saturdays from 8:30am-11:30am.',
    array['classroom', 'SOT616B', 'DATABASE SYSTEMS', 'Consultancy 1', 'CS 101', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT600B - Project',
    'Project (SOT600B) is not scheduled and the location is TBA.',
    array['classroom', 'SOT600B', 'Project', 'TBA', 'not scheduled', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'LAS202B - COMMUNICATION SKILLS II',
    'COMMUNICATION SKILLS II (LAS202B) is held in Consultancy 1 (CS 201) on Thursdays from 5pm-8pm.',
    array['classroom', 'LAS202B', 'COMMUNICATION SKILLS II', 'Consultancy 1', 'CS 201', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'CSC201B/ICT201B/SOT004B - DATABASE DESIGN I / DATABASE SYSTEMS / Principles of Database Systems',
    'DATABASE DESIGN I / DATABASE SYSTEMS / Principles of Database Systems (CSC201B/ICT201B/SOT004B) is held in PSMTP Auditorium on Tuesdays from 5pm-8pm.',
    array['classroom', 'CSC201B', 'ICT201B', 'SOT004B', 'DATABASE DESIGN I', 'DATABASE SYSTEMS', 'Principles of Database Systems', 'PSMTP Auditorium', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'SOT204B/SOT006B - PROBABILITY AND STATISTICS / INTRODUCTION TO PROBABILITY',
    'PROBABILITY AND STATISTICS / INTRODUCTION TO PROBABILITY (SOT204B/SOT006B) is held in GB 303 (Graduate Block, Room 303) on Wednesdays from 5pm-8pm.',
    array['classroom', 'SOT204B', 'SOT006B', 'PROBABILITY AND STATISTICS', 'INTRODUCTION TO PROBABILITY', 'GB 303', 'graduate block', 'location']
),

-- NEW ROOM SUMMARIES
(
    'GIMPA-Classroom-Locations',
    'GB 303 - Graduate Block Room 303',
    'GB 303 (Graduate Block, Room 303) hosts courses including: ELECTRONIC CIRCUITS/DIGITAL ELECTRONICS (SOT210B/SOT015B) and PROBABILITY AND STATISTICS/INTRODUCTION TO PROBABILITY (SOT204B/SOT006B).',
    array['classroom', 'GB 303', 'graduate block', 'SOT210B', 'SOT015B', 'SOT204B', 'SOT006B', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'Consultancy 1 (CS 101)',
    'Consultancy 1 (CS 101) hosts DATABASE SYSTEMS (SOT616B) on Saturdays.',
    array['classroom', 'Consultancy 1', 'CS 101', 'SOT616B', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'Consultancy 1 (CS 201)',
    'Consultancy 1 (CS 201) hosts COMMUNICATION SKILLS II (LAS202B) on Thursdays.',
    array['classroom', 'Consultancy 1', 'CS 201', 'LAS202B', 'location']
),
(
    'GIMPA-Classroom-Locations',
    'PSMTP Auditorium',
    'PSMTP Auditorium hosts DATABASE DESIGN I / DATABASE SYSTEMS / Principles of Database Systems (CSC201B/ICT201B/SOT004B) on Tuesdays.',
    array['classroom', 'PSMTP Auditorium', 'CSC201B', 'ICT201B', 'SOT004B', 'location']
);
