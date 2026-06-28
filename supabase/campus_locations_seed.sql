-- ================================
-- GIMPA Campus Locations for AI Knowledge Base
-- ================================

insert into public.ai_knowledge (source, section, content, tags) values
-- MAIN CAMPUS ENTRANCES
(
    'GIMPA-Locations',
    'GIMPA Junction Main Gate',
    'The main entrance is GIMPA Junction (Main Gate), right off the Legon Bypass. This is the primary entrance most people use to access the Greenhill Campus.',
    array['locations', 'entrance', 'main gate', 'gimpa junction', 'campus access']
),
(
    'GIMPA-Locations',
    'South-Eastern Gate',
    'GIMPA has a South-Eastern Gate as an alternative entrance to the campus.',
    array['locations', 'entrance', 'gate', 'campus access']
),

-- ADMINISTRATIVE BUILDINGS
(
    'GIMPA-Locations',
    'Main Administration Block',
    'The Main Administration Block is the central hub for administrative offices, including the Rector office and the Registry. It is one of the main buildings on the Greenhill campus.',
    array['locations', 'administration', 'registry', 'rector office', 'admin block']
),

-- ACADEMIC BUILDINGS
(
    'GIMPA-Locations',
    'GIMPA Business School Building',
    'The GIMPA Business School building is on the main Greenhill campus. It houses the Business School lectures and offices for business administration programs.',
    array['locations', 'business school', 'gba', 'academic building', 'lectures']
),
(
    'GIMPA-Locations',
    'Faculty of Law Building',
    'The Faculty of Law building houses the Law programs. The Law Library is located on the top floor of the Law Faculty building.',
    array['locations', 'law', 'faculty of law', 'law library', 'academic building']
),
(
    'GIMPA-Locations',
    'School of Technology Building',
    'The School of Technology building houses IT and computing programs. The IT office is located in the School of Technology building for Wi-Fi and technical support.',
    array['locations', 'technology', 'school of technology', 'it office', 'academic building']
),
(
    'GIMPA-Locations',
    'Graduate Lecture Block',
    'The Graduate Lecture Block is on the Greenhill campus and is used for postgraduate lectures and classes.',
    array['locations', 'graduate', 'postgraduate', 'lecture block', 'academic building']
),

-- LIBRARY
(
    'GIMPA-Locations',
    'Main Library (Lending and Reference)',
    'The main library (Lending and Reference) is at the apex of the Greenhill campus, opposite CBG bank, across the car park. It is the primary library for general study and research.',
    array['locations', 'library', 'main library', 'study', 'research']
),
(
    'GIMPA-Locations',
    'Law Library',
    'The Law Library is on the top floor of the Law Faculty building and provides specialized legal resources for law students.',
    array['locations', 'library', 'law library', 'legal resources', 'law faculty']
),

-- STUDENT SERVICES
(
    'GIMPA-Locations',
    'Student Affairs Building',
    'The Office of the Dean of Students is located in the Student Affairs Building, adjacent the Consultancy Block, Number 2 Oval Street, PO Box AH 50, Achimota, Accra.',
    array['locations', 'student affairs', 'dean of students', 'student services']
),
(
    'GIMPA-Locations',
    'Campus Clinic',
    'The Campus Clinic is on the main GIMPA Greenhill campus. It provides medical services and first aid to students and staff.',
    array['locations', 'clinic', 'medical', 'health services', 'campus clinic']
),
(
    'GIMPA-Locations',
    'Hawa Yakubu Hostel',
    'Hawa Yakubu Hostel is the student accommodation on campus. For availability and room applications, check with the Student Affairs office.',
    array['locations', 'hostel', 'accommodation', 'housing', 'student housing']
),

-- DINING AND RECREATION
(
    'GIMPA-Locations',
    'Greenhill Cafeteria',
    'Greenhill Cafeteria is the main spot to grab food on campus. It is a popular hangout between classes and serves as the primary dining facility.',
    array['locations', 'cafeteria', 'food', 'dining', 'greenhill cafeteria']
),

-- EVENTS AND CONFERENCES
(
    'GIMPA-Locations',
    'Executive Conference Centre (ECC)',
    'The Executive Conference Centre (ECC) is where GIMPA hosts conferences, seminars, and major events. It is one of the landmark buildings on the Greenhill campus.',
    array['locations', 'conference centre', 'ecc', 'events', 'seminars']
),

-- PARKING
(
    'GIMPA-Locations',
    'Students Car Park',
    'There is a designated Students Car Park on campus for student vehicles.',
    array['locations', 'parking', 'car park', 'student parking']
),

-- OTHER CAMPUSES
(
    'GIMPA-Locations',
    'Kumasi Campus',
    'GIMPA has a campus in Kumasi, Ashanti Region. It is one of four GIMPA campuses.',
    array['locations', 'kumasi campus', 'regional campus']
),
(
    'GIMPA-Locations',
    'Takoradi Campus',
    'GIMPA has a campus in Takoradi, Western Region. It is one of four GIMPA campuses.',
    array['locations', 'takoradi campus', 'regional campus']
),
(
    'GIMPA-Locations',
    'Tema Campus',
    'GIMPA has a campus in Tema, Greater Accra Region. It is one of four GIMPA campuses.',
    array['locations', 'tema campus', 'regional campus']
),

-- CAMPUS LANDMARKS
(
    'GIMPA-Locations',
    'Greenhill Campus Overview',
    'The Greenhill Campus is the main GIMPA campus in Accra, off the Legon Bypass. It houses the main administration, Business School, Faculty of Law, School of Technology, Library, Cafeteria, and most student facilities. It is the primary campus where most undergraduate programmes are based.',
    array['locations', 'greenhill campus', 'main campus', 'accra', 'campus overview']
),
(
    'GIMPA-Locations',
    'CBG Bank on Campus',
    'CBG Bank has a branch on campus located opposite the main library at the apex of Greenhill campus.',
    array['locations', 'bank', 'cbg', 'financial services']
),

-- DIRECTIONS AND NAVIGATION
(
    'GIMPA-Locations',
    'Getting to GIMPA',
    'GIMPA Greenhill Campus is located off the Legon Bypass in Accra. The main entrance is at GIMPA Junction. The campus is easily accessible by car and public transportation.',
    array['locations', 'directions', 'access', 'legon bypass', 'gimpa junction']
);
