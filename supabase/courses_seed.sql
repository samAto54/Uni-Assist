-- ================================
-- GIMPA Course Catalog for AI Knowledge Base
-- Extracted from gimpa_academic_info.md
-- ================================

insert into public.ai_knowledge (source, section, content, tags) values
-- GIMPA BUSINESS SCHOOL COURSES
(
    'GIMPA-Courses',
    'Business School - BSc Business Administration',
    'Bachelor of Science (Honours) in Business Administration is GIMPA Business School flagship undergraduate program providing comprehensive foundation in business principles and practices. Specializations include: Accounting, Banking and Finance, Human Resource Management, Marketing, Operations and Project Management, Entrepreneurship and Innovation. Admission requires WASSCE credit passes (A1-C6) in six subjects including English, Mathematics and three relevant electives, or SSSCE credit passes (A-D) in six subjects including core English and Mathematics. GCE A-Level requires passes in at least three subjects plus five O-Level credit passes including English and Mathematics.',
    array['courses', 'business administration', 'undergraduate', 'bsc', 'accounting', 'finance', 'hr', 'marketing', 'operations', 'entrepreneurship']
),
(
    'GIMPA-Courses',
    'Business School - BSc Accounting',
    'Bachelor of Science in Accounting is a specialized program focusing on accounting principles, auditing, taxation, and financial reporting. Admission requirements are similar to BSc Business Administration with preference given to applicants with strong mathematics background. WASSCE candidates need credit passes in six subjects including English, Mathematics and three relevant electives.',
    array['courses', 'accounting', 'undergraduate', 'bsc', 'finance', 'auditing', 'taxation']
),
(
    'GIMPA-Courses',
    'Business School - MBA',
    'Master of Business Administration (MBA) is a general management program covering key business disciplines. Admission requires Bachelor degree with minimum Second Class Lower Division typically required, some programs require minimum GPA of 3.3 or higher, professional experience requirements for executive programs typically 3-5 years, and possible admission interview.',
    array['courses', 'mba', 'masters', 'business administration', 'graduate', 'postgraduate']
),
(
    'GIMPA-Courses',
    'Business School - Executive MBA',
    'Executive MBA (EMBA) is tailored for experienced professionals and executives. Admission requires Bachelor degree, significant professional work experience typically 3-5 years or more for executive programs, and interview assessment. The program features weekend or modular scheduling designed for working professionals.',
    array['courses', 'emba', 'executive mba', 'masters', 'business administration', 'graduate', 'professional']
),
(
    'GIMPA-Courses',
    'Business School - MSc Finance',
    'Master of Science in Finance is a specialized program focusing on financial management and markets. Admission requires Bachelor degree in relevant field with minimum Second Class Lower Division, strong academic record typically minimum GPA of 3.3 or higher, and possible interview.',
    array['courses', 'finance', 'msc', 'masters', 'financial management', 'graduate']
),
(
    'GIMPA-Courses',
    'Business School - MSc Energy Economics',
    'Master of Science in Energy Economics focuses on economic aspects of energy sector management. Admission requires Bachelor degree in relevant field such as economics, engineering, or business with minimum Second Class Lower Division.',
    array['courses', 'energy economics', 'msc', 'masters', 'energy', 'economics', 'graduate']
),
(
    'GIMPA-Courses',
    'Business School - MSc Leadership',
    'Master of Science in Leadership concentrates on leadership development and organizational effectiveness. Admission requires Bachelor degree with minimum Second Class Lower Division, professional experience may be considered, and possible interview assessment.',
    array['courses', 'leadership', 'msc', 'masters', 'management', 'organizational development', 'graduate']
),

-- SCHOOL OF PUBLIC SERVICE AND GOVERNANCE COURSES
(
    'GIMPA-Courses',
    'Public Service - BA Public Administration',
    'Bachelor of Arts in Public Administration prepares students for careers in government, public service, and related organizations. Admission requires standard undergraduate requirements with WASSCE/SSSCE candidates, social science or general arts background often preferred. Credit passes in six subjects including English and Mathematics required.',
    array['courses', 'public administration', 'undergraduate', 'ba', 'government', 'public sector']
),
(
    'GIMPA-Courses',
    'Public Service - BSc Economics and Political Science',
    'Bachelor of Science in Economics and Political Science is an interdisciplinary program examining economic systems and political structures, preparing graduates for roles in policy analysis and development. Admission requires credit passes in Mathematics, English, and Social Studies plus additional requirements similar to other undergraduate programs.',
    array['courses', 'economics', 'political science', 'undergraduate', 'bsc', 'policy', 'interdisciplinary']
),
(
    'GIMPA-Courses',
    'Public Service - MPA',
    'Master of Public Administration (MPA) develops public sector management capabilities. Admission requires Bachelor degree in relevant field, professional experience in public sector advantageous, letter of motivation or skills application plan may be required, and minimum Second Class Lower Division.',
    array['courses', 'public administration', 'mpa', 'masters', 'public sector', 'governance', 'graduate']
),
(
    'GIMPA-Courses',
    'Public Service - Master of Governance and Leadership',
    'Master of Governance and Leadership focuses on governance systems and leadership practices. Admission requires Bachelor degree in relevant field such as political science, public administration, or related disciplines with minimum Second Class Lower Division.',
    array['courses', 'governance', 'leadership', 'masters', 'public sector', 'graduate']
),
(
    'GIMPA-Courses',
    'Public Service - Masters in International Relations and Diplomacy',
    'Masters in International Relations and Diplomacy prepares for careers in international affairs. Admission requires Bachelor degree in relevant field such as political science, international relations, or related disciplines with minimum Second Class Lower Division.',
    array['courses', 'international relations', 'diplomacy', 'masters', 'foreign affairs', 'graduate']
),

-- FACULTY OF LAW COURSES
(
    'GIMPA-Courses',
    'Law - LLB Undergraduate',
    'Bachelor of Laws (LLB) provides comprehensive legal education leading to professional qualification. Admission requires generally higher grade requirements than other undergraduate programs. WASSCE candidates need credit passes (A1-C6) in six subjects including English, Mathematics, and Sciences/Social Studies. Mature applicants 25+ years may be considered through entrance examination.',
    array['courses', 'law', 'llb', 'undergraduate', 'legal education', 'bar']
),
(
    'GIMPA-Courses',
    'Law - LLM',
    'Master of Laws (LLM) provides advanced legal studies with possible specializations. Admission requires First degree in Law typically LLB, professional legal qualification may be advantageous, higher academic threshold often applied with Second Class Upper may be preferred, and possible interview.',
    array['courses', 'law', 'llm', 'masters', 'legal studies', 'graduate']
),
(
    'GIMPA-Courses',
    'Law - Post-First Degree LLB',
    'Post-First Degree Bachelor of Laws is for graduates who want to study law. Admission requires Bachelor degree in any field with minimum Second Class Lower Division, application fee is GHc 350, and possible entrance examination.',
    array['courses', 'law', 'llb', 'postgraduate', 'professional law', 'graduate']
),

-- SCHOOL OF TECHNOLOGY COURSES
(
    'GIMPA-Courses',
    'Technology - BSc Information Technology',
    'Bachelor of Science in Information Technology develops skills in computing, programming, and information systems management. Admission requires credit passes in Mathematics and English. For WASSCE candidates, credit passes in elective subjects including Mathematics or Physics. Technical background or prior IT exposure may be advantageous.',
    array['courses', 'information technology', 'undergraduate', 'bsc', 'computing', 'programming', 'it']
),
(
    'GIMPA-Courses',
    'Technology - BSc Computer Science',
    'Bachelor of Science in Computer Science focuses on theoretical foundations and practical applications of computing. Admission requires strong mathematics background, credit passes in Core Mathematics, English, and Integrated Science, and credit passes in Elective Mathematics and/or Physics preferred.',
    array['courses', 'computer science', 'undergraduate', 'bsc', 'computing', 'programming']
),
(
    'GIMPA-Courses',
    'Technology - MSc Information Technology',
    'Master of Science in Information Technology provides advanced IT capabilities development. Admission requires Bachelor degree in computing, engineering, or related field, relevant professional experience may be considered, and technical background assessment may be conducted.',
    array['courses', 'information technology', 'msc', 'masters', 'computing', 'graduate']
),
(
    'GIMPA-Courses',
    'Technology - MSc Digital Forensics and Cybersecurity',
    'Master of Science in Digital Forensics and Cybersecurity is a specialized program in information security. Admission requires Bachelor degree in computing, engineering, or related field, relevant professional experience may be considered, and technical background assessment may be conducted.',
    array['courses', 'digital forensics', 'cybersecurity', 'msc', 'masters', 'information security', 'graduate']
),
(
    'GIMPA-Courses',
    'Technology - MSc ICT, IT & Law',
    'Master of Science in ICT, IT & Law is an interdisciplinary program bridging technology and legal domains. Admission requires Bachelor degree in computing, law, or related field, relevant professional experience may be considered, and interdisciplinary background assessment may be conducted.',
    array['courses', 'ict', 'it law', 'msc', 'masters', 'interdisciplinary', 'technology law', 'graduate']
),

-- SCHOOL OF LIBERAL ARTS AND SOCIAL SCIENCES COURSES
(
    'GIMPA-Courses',
    'Liberal Arts - BA Communication Studies',
    'Bachelor of Arts in Communication Studies develops skills in various communication domains including media, corporate communications, and public relations. Admission requires standard undergraduate admission requirements with strong English language skills particularly emphasized.',
    array['courses', 'communication studies', 'undergraduate', 'ba', 'media', 'public relations', 'corporate communications']
),
(
    'GIMPA-Courses',
    'Liberal Arts - BA Political Science',
    'Bachelor of Arts in Political Science examines political systems, governance structures, and public policy. Admission requires similar requirements to other undergraduate programs with Social Science or General Arts background often preferred.',
    array['courses', 'political science', 'undergraduate', 'ba', 'politics', 'governance', 'public policy']
),
(
    'GIMPA-Courses',
    'Liberal Arts - MA Political Science',
    'Master of Arts in Political Science provides advanced study of political systems and governance. Admission requires Bachelor degree in relevant humanities or social science discipline, research proposal may be required, and standard postgraduate admission requirements apply.',
    array['courses', 'political science', 'ma', 'masters', 'politics', 'governance', 'graduate']
),
(
    'GIMPA-Courses',
    'Liberal Arts - MA Development Studies',
    'Master of Arts in Development Studies focuses on sustainable development theories and practices. Admission requires Bachelor degree in relevant humanities or social science discipline, research proposal may be required, and standard postgraduate admission requirements apply.',
    array['courses', 'development studies', 'ma', 'masters', 'sustainable development', 'graduate']
),

-- DIPLOMA PROGRAMS
(
    'GIMPA-Courses',
    'Diploma - Diploma in Public Administration',
    'Diploma in Public Administration serves as standalone qualification and potential pathway to degree programs. Admission requires Senior High School Certificate or equivalent, typically 5-6 passes in relevant subjects, English and Mathematics usually required, lower threshold than degree programs, may accept alternative qualifications based on relevance.',
    array['courses', 'diploma', 'public administration', 'undergraduate', 'certificate']
),
(
    'GIMPA-Courses',
    'Diploma - Diploma in Business Studies',
    'Diploma in Business Studies provides foundational business education. Admission requires Senior High School Certificate or equivalent, typically 5-6 passes in relevant subjects including English and Mathematics, lower threshold than degree programs.',
    array['courses', 'diploma', 'business studies', 'undergraduate', 'certificate']
),
(
    'GIMPA-Courses',
    'Diploma - Diploma in Management Studies',
    'Diploma in Management Studies focuses on management principles and practices. Admission requires Senior High School Certificate or equivalent, typically 5-6 passes in relevant subjects including English and Mathematics, lower threshold than degree programs.',
    array['courses', 'diploma', 'management studies', 'undergraduate', 'certificate']
),

-- POSTGRADUATE DIPLOMA PROGRAMS
(
    'GIMPA-Courses',
    'Postgraduate Diploma - PGD Public Administration',
    'Postgraduate Diploma in Public Administration provides specialized training for degree holders who may not wish to pursue full master degrees. Admission requires Bachelor degree in relevant field, less stringent academic requirements than master programs, professional experience may be considered in lieu of strict academic qualifications.',
    array['courses', 'postgraduate diploma', 'public administration', 'pgd', 'graduate']
),
(
    'GIMPA-Courses',
    'Postgraduate Diploma - PGD Management Studies',
    'Postgraduate Diploma in Management Studies provides specialized management training. Admission requires Bachelor degree in relevant field, less stringent academic requirements than master programs, professional experience may be considered.',
    array['courses', 'postgraduate diploma', 'management studies', 'pgd', 'graduate']
),
(
    'GIMPA-Courses',
    'Postgraduate Diploma - PGD Corporate Governance',
    'Postgraduate Diploma in Corporate Governance focuses on governance principles and practices. Admission requires Bachelor degree in relevant field, less stringent academic requirements than master programs, professional experience may be considered.',
    array['courses', 'postgraduate diploma', 'corporate governance', 'pgd', 'graduate']
),

-- DOCTORAL PROGRAMS
(
    'GIMPA-Courses',
    'Doctoral - PhD Programs',
    'Doctor of Philosophy (PhD) programs are available in various disciplines across GIMPA academic schools. Admission requires Master degree in relevant field, strong academic record typically minimum of Second Class Upper at undergraduate level, well-developed research proposal, evidence of research capability, interview performance, and availability of suitable supervision in proposed research area.',
    array['courses', 'phd', 'doctorate', 'doctoral', 'research', 'graduate']
),
(
    'GIMPA-Courses',
    'Doctoral - Doctor of Management (DMGT)',
    'Doctor of Management (DMGT) is an executive-focused doctoral program emphasizing applied management research. Admission requires Master degree in relevant field, significant post-Master senior management experience minimum five years typically required, research proposal with practical management application, and interview assessment.',
    array['courses', 'doctor of management', 'dmgt', 'doctorate', 'executive doctoral', 'graduate']
),

-- PROFESSIONAL AND EXECUTIVE EDUCATION
(
    'GIMPA-Courses',
    'Professional - Short Courses',
    'GIMPA offers various short-term professional development courses through Training & Consulting services including Leadership Development, Strategic Management, Public Financial Management, Human Resource Management, Project Management, Supply Chain Management, and Corporate Governance. Requirements vary by program, typically open to professionals with relevant experience, some courses may require specific educational backgrounds, selection often emphasizes professional relevance rather than strict academic criteria.',
    array['courses', 'short courses', 'professional development', 'executive education', 'training', 'certificate']
),
(
    'GIMPA-Courses',
    'Professional - Customized Corporate Training',
    'GIMPA provides tailored training solutions for organizations seeking to develop their workforce in specific areas. Requirements are determined through needs assessment, developed in consultation with client organizations, and focused on addressing specific organizational challenges and goals.',
    array['courses', 'corporate training', 'customized training', 'executive education', 'professional development']
);
