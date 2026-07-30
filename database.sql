-- ============================================================
-- Globus Technical Academy ERP v1.00
-- Database Schema — PostgreSQL (Supabase)
-- Part 1: Office ERP Foundation
-- ============================================================

-- 1. Institute Settings (white-label config)
CREATE TABLE IF NOT EXISTS institute_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_name TEXT NOT NULL DEFAULT 'Globus Technical Academy',
    tagline TEXT DEFAULT 'Excellence in Technical Education',
    logo_url TEXT DEFAULT '',
    primary_color TEXT DEFAULT '#1a3a5c',
    accent_color TEXT DEFAULT '#4a90d9',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    website TEXT DEFAULT '',
    country_code TEXT DEFAULT '91',
    currency_symbol TEXT DEFAULT '₹',
    academic_year TEXT DEFAULT '2025-26',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default settings
INSERT INTO institute_settings (institute_name) VALUES ('Globus Technical Academy')
ON CONFLICT DO NOTHING;

-- 2. Courses
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name TEXT NOT NULL,
    course_code TEXT UNIQUE NOT NULL,
    duration TEXT DEFAULT '',
    total_fee NUMERIC(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Modules
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name TEXT NOT NULL,
    module_number INT NOT NULL,
    description TEXT DEFAULT '',
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    qualification TEXT DEFAULT '',
    address TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    current_module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_fee NUMERIC(12,2) DEFAULT 0,
    total_paid NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Course Finished','Discontinued','Archived')),
    finished_date DATE,
    discontinued_date DATE,
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast search
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(student_code);

-- 5. Fee Payments
CREATE TABLE IF NOT EXISTS fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash','UPI','Card','Bank Transfer','Cheque','Other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT DEFAULT '',
    is_admission_fee BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fees_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_date ON fee_payments(payment_date);

-- 6. Office Users (profile extension for auth.users)
CREATE TABLE IF NOT EXISTS office_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT DEFAULT '',
    role TEXT DEFAULT 'office' CHECK (role IN ('office','admin','superadmin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT DEFAULT '',
    type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
    is_read BOOLEAN DEFAULT false,
    target_role TEXT DEFAULT 'office',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Auto student code function
CREATE OR REPLACE FUNCTION generate_student_code()
RETURNS TEXT AS $$
DECLARE
    next_num INT;
    code TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(student_code FROM 4) AS INT)), 0) + 1
    INTO next_num
    FROM students;
    code := 'GTA' || LPAD(next_num::TEXT, 4, '0');
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 9. Auto receipt number function
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    next_num INT;
    receipt TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 5) AS INT)), 0) + 1
    INTO next_num
    FROM fee_payments;
    receipt := 'RCP-' || LPAD(next_num::TEXT, 5, '0');
    RETURN receipt;
END;
$$ LANGUAGE plpgsql;

-- 10. Row Level Security
ALTER TABLE institute_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies: allow authenticated users full access (refine in Part 4 Admin Portal)
CREATE POLICY "Authenticated read institute_settings" ON institute_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated all courses" ON courses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all modules" ON modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all students" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all fee_payments" ON fee_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all office_users" ON office_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all notifications" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_students_updated
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated
    BEFORE UPDATE ON institute_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
