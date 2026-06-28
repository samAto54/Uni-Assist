-- ================================
-- GIMPA Fees Data for AI Knowledge Base
-- Academic Year 2024/2025
-- ================================

-- Insert fee data into ai_knowledge table
insert into public.ai_knowledge (source, section, content, tags) values
-- LOCAL STUDENTS FEES
(
    'GIMPA-Fees-2024-2025',
    'Local Students - Diploma Programs',
    'Diploma programs for local students: Semester 1 - GHS 3,715, Semester 2 - GHS 3,715, Total for the year - GHS 7,430',
    array['fees', 'tuition', 'diploma', 'local', 'ghs', 'undergraduate']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - Undergraduate Programs',
    'All Undergraduate programs (except Law) for local students: Semester 1 - GHS 5,615, Semester 2 - GHS 5,615, Total for the year - GHS 11,230',
    array['fees', 'tuition', 'undergraduate', 'local', 'ghs', 'bachelor']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - Law Undergraduate Day',
    'Faculty of Law - Undergraduate Day program for local students: Semester 1 - GHS 7,475, Semester 2 - GHS 7,475, Total for the year - GHS 14,950',
    array['fees', 'tuition', 'law', 'undergraduate', 'day', 'local', 'ghs', 'llb']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - Law Undergraduate Evening',
    'Faculty of Law - Undergraduate Evening program for local students: Semester 1 - GHS 9,790, Semester 2 - GHS 9,790, Total for the year - GHS 19,580',
    array['fees', 'tuition', 'law', 'undergraduate', 'evening', 'local', 'ghs', 'llb']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - Law One Year Masters',
    'Faculty of Law - One Year Masters program for local students: Semester 1 - GHS 15,890, Semester 2 - GHS 10,690, Total for the year - GHS 26,580',
    array['fees', 'tuition', 'law', 'masters', 'llm', 'local', 'ghs']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - 6 Months Postgraduate',
    'All 6 Months Postgraduate programs for local students: Semester 1 - GHS 9,190, Total for the program - GHS 9,190',
    array['fees', 'tuition', 'postgraduate', '6 months', 'local', 'ghs', 'certificate']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - One Year Postgraduate Diploma',
    'All One Year Postgraduate Diploma programs for local students: Semester 1 - GHS 6,690, Semester 2 - GHS 6,690, Total for the year - GHS 13,380',
    array['fees', 'tuition', 'postgraduate', 'diploma', 'local', 'ghs']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - One Year Trimester Masters',
    'All One Year Trimester Masters programs for local students: Trimester 1 - GHS 13,190, Trimester 2 - GHS 6,690, Trimester 3 - GHS 6,500, Total for the year - GHS 26,380',
    array['fees', 'tuition', 'masters', 'trimester', 'one year', 'local', 'ghs']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - One Year Quarterly Masters',
    'All One Year Quarterly Masters programs for local students: Quarter 1 - GHS 10,590, Quarter 2 - GHS 7,990, Quarter 3 - GHS 7,800, Total for the year - GHS 26,380',
    array['fees', 'tuition', 'masters', 'quarterly', 'one year', 'local', 'ghs']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - Two Year Trimester Masters',
    'All Two Year Trimester Masters programs for local students: Trimester 1 - GHS 10,690, Trimester 2 - GHS 5,440, Trimester 3 - GHS 5,250, Total for the year - GHS 21,380',
    array['fees', 'tuition', 'masters', 'trimester', 'two year', 'local', 'ghs']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - Two Year Regular Masters',
    'All Two Year Regular Masters programs for local students: Semester 1 - GHS 12,790, Semester 2 - GHS 8,590, Total for the year - GHS 21,380',
    array['fees', 'tuition', 'masters', 'regular', 'two year', 'local', 'ghs']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - Two Year Modular Masters',
    'All Two Year Modular Masters programs for local students: Semester 1 - GHS 13,555, Semester 2 - GHS 9,355, Total for the year - GHS 22,910',
    array['fees', 'tuition', 'masters', 'modular', 'two year', 'local', 'ghs']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - PhD Programs',
    'All PhD programs for local students: Semester 1 - GHS 21,190, Semester 2 - GHS 14,190, Total for the year - GHS 35,380',
    array['fees', 'tuition', 'phd', 'doctorate', 'local', 'ghs']
),
(
    'GIMPA-Fees-2024-2025',
    'Local Students - Doctor of Management',
    'Doctor of Management program for local students: Semester 1 - GHS 26,700, Semester 2 - GHS 26,700, Total for the year - GHS 53,400',
    array['fees', 'tuition', 'doctor of management', 'dba', 'local', 'ghs']
),

-- WEST AFRICA FOREIGN STUDENTS FEES
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - Diploma Programs',
    'Diploma programs for West Africa foreign students: Session 1 - USD 720, Session 2 - USD 720, Total for the year - USD 1,440',
    array['fees', 'tuition', 'diploma', 'foreign', 'west africa', 'usd', 'international']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - Undergraduate Programs',
    'All Undergraduate programs (except Law) for West Africa foreign students: Session 1 - USD 1,125, Session 2 - USD 1,125, Total for the year - USD 2,250',
    array['fees', 'tuition', 'undergraduate', 'foreign', 'west africa', 'usd', 'international', 'bachelor']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - Law Undergraduate Day & Evening',
    'Faculty of Law - Undergraduate Day & Evening programs for West Africa foreign students: Session 1 - USD 1,750, Session 2 - USD 1,750, Total for the year - USD 3,500',
    array['fees', 'tuition', 'law', 'undergraduate', 'foreign', 'west africa', 'usd', 'international', 'llb']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - Law One Year Masters',
    'Faculty of Law - One Year Masters program for West Africa foreign students: Session 1 - USD 3,060, Session 2 - USD 2,060, Total for the year - USD 5,120',
    array['fees', 'tuition', 'law', 'masters', 'llm', 'foreign', 'west africa', 'usd', 'international']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - 6 Months Postgraduate',
    'All 6 Months Postgraduate programs for West Africa foreign students: Session 1 - USD 1,690, Total for the program - USD 1,690',
    array['fees', 'tuition', 'postgraduate', '6 months', 'foreign', 'west africa', 'usd', 'international', 'certificate']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - One Year Postgraduate Diploma',
    'All One Year Postgraduate Diploma programs for West Africa foreign students: Session 1 - USD 1,480, Session 2 - USD 1,000, Total for the year - USD 2,480',
    array['fees', 'tuition', 'postgraduate', 'diploma', 'foreign', 'west africa', 'usd', 'international']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - One Year Trimester Masters',
    'All One Year Trimester Masters programs for West Africa foreign students: Trimester 1 - USD 2,540, Trimester 2 - USD 1,290, Trimester 3 - USD 1,250, Total for the year - USD 5,080',
    array['fees', 'tuition', 'masters', 'trimester', 'one year', 'foreign', 'west africa', 'usd', 'international']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - One Year Quarterly Masters',
    'All One Year Quarterly Masters programs for West Africa foreign students: Quarter 1 - USD 2,540, Quarter 2 - USD 1,290, Quarter 3 - USD 1,250, Total for the year - USD 5,080',
    array['fees', 'tuition', 'masters', 'quarterly', 'one year', 'foreign', 'west africa', 'usd', 'international']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - Two Year Trimester Masters',
    'All Two Year Trimester Masters programs for West Africa foreign students: Trimester 1 - USD 2,040, Trimester 2 - USD 1,040, Trimester 3 - USD 1,000, Total for the year - USD 4,080',
    array['fees', 'tuition', 'masters', 'trimester', 'two year', 'foreign', 'west africa', 'usd', 'international']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - Two Year Regular Masters',
    'All Two Year Regular Masters programs for West Africa foreign students: Session 1 - USD 2,440, Session 2 - USD 1,640, Total for the year - USD 4,080',
    array['fees', 'tuition', 'masters', 'regular', 'two year', 'foreign', 'west africa', 'usd', 'international']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign West Africa - Two Year Modular Masters',
    'All Two Year Modular Masters programs for West Africa foreign students: Session 1 - USD 2,440, Session 2 - USD 1,640, Total for the year - USD 4,080',
    array['fees', 'tuition', 'masters', 'modular', 'two year', 'foreign', 'west africa', 'usd', 'international']
),

-- OTHER INTERNATIONAL STUDENTS FEES
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - Diploma Programs',
    'Diploma programs for other international students: Session 1 - USD 980, Session 2 - USD 980, Total for the year - USD 1,960',
    array['fees', 'tuition', 'diploma', 'foreign', 'international', 'usd']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - Undergraduate Programs',
    'All Undergraduate programs (except Law) for other international students: Session 1 - USD 1,730, Session 2 - USD 1,730, Total for the year - USD 3,460',
    array['fees', 'tuition', 'undergraduate', 'foreign', 'international', 'usd', 'bachelor']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - Law Undergraduate Day & Evening',
    'Faculty of Law - Undergraduate Day & Evening programs for other international students: Session 1 - USD 2,550, Session 2 - USD 2,550, Total for the year - USD 5,100',
    array['fees', 'tuition', 'law', 'undergraduate', 'foreign', 'international', 'usd', 'llb']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - Law One Year Masters',
    'Faculty of Law - One Year Masters program for other international students: Session 1 - USD 3,060, Session 2 - USD 2,060, Total for the year - USD 5,120',
    array['fees', 'tuition', 'law', 'masters', 'llm', 'foreign', 'international', 'usd']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - 6 Months Postgraduate',
    'All 6 Months Postgraduate programs for other international students: Session 1 - USD 2,540, Total for the program - USD 2,540',
    array['fees', 'tuition', 'postgraduate', '6 months', 'foreign', 'international', 'usd', 'certificate']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - One Year Postgraduate Diploma',
    'All One Year Postgraduate Diploma programs for other international students: Session 1 - USD 2,140, Session 2 - USD 1,440, Total for the year - USD 3,580',
    array['fees', 'tuition', 'postgraduate', 'diploma', 'foreign', 'international', 'usd']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - One Year Trimester Masters',
    'All One Year Trimester Masters programs for other international students: Trimester 1 - USD 3,740, Trimester 2 - USD 1,890, Trimester 3 - USD 1,850, Total for the year - USD 7,480',
    array['fees', 'tuition', 'masters', 'trimester', 'one year', 'foreign', 'international', 'usd']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - One Year Quarterly Masters',
    'All One Year Quarterly Masters programs for other international students: Quarter 1 - USD 3,740, Quarter 2 - USD 1,890, Quarter 3 - USD 1,850, Total for the year - USD 7,480',
    array['fees', 'tuition', 'masters', 'quarterly', 'one year', 'foreign', 'international', 'usd']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - Two Year Trimester Masters',
    'All Two Year Trimester Masters programs for other international students: Trimester 1 - USD 3,190, Trimester 2 - USD 1,615, Trimester 3 - USD 1,575, Total for the year - USD 6,380',
    array['fees', 'tuition', 'masters', 'trimester', 'two year', 'foreign', 'international', 'usd']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - Two Year Regular Masters',
    'All Two Year Regular Masters programs for other international students: Session 1 - USD 3,820, Session 2 - USD 2,560, Total for the year - USD 6,380',
    array['fees', 'tuition', 'masters', 'regular', 'two year', 'foreign', 'international', 'usd']
),
(
    'GIMPA-Fees-2024-2025',
    'Foreign International - Two Year Modular Masters',
    'All Two Year Modular Masters programs for other international students: Session 1 - USD 3,820, Session 2 - USD 2,560, Total for the year - USD 6,380',
    array['fees', 'tuition', 'masters', 'modular', 'two year', 'foreign', 'international', 'usd']
),

-- SUMMARY INFORMATION
(
    'GIMPA-Fees-2024-2025',
    'Fee Structure Overview',
    'GIMPA fees are structured by student category (Local, West Africa Foreign, Other International), program type (Diploma, Undergraduate, Postgraduate, Masters, PhD), and program duration. Local fees are in Ghana Cedis (GHS), foreign fees in US Dollars (USD). Fees are payable per semester/trimester/quarter/session.',
    array['fees', 'tuition', 'overview', 'structure', 'payment', 'currency']
),
(
    'GIMPA-Fees-2024-2025',
    'Fee Payment Schedule',
    'Fees are payable according to the academic calendar: Semester programs have 2 payments per year, Trimester programs have 3 payments per year, Quarterly programs have 3 payments per year, Session programs have 2 payments per year. 6-month programs require a single payment.',
    array['fees', 'tuition', 'payment', 'schedule', 'semester', 'trimester', 'quarter']
);
