-- ============================================================
-- Globus Technical Academy ERP v1.00
-- Database Schema Additions — Part 2: Student Portal
-- ============================================================

-- 1. Add password column to students table for student login
ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT '';

-- 2. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Leave', 'Half Day')),
    remarks TEXT DEFAULT '',
    marked_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

-- 3. Student Notifications (read status per student)
CREATE TABLE IF NOT EXISTS student_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    UNIQUE(notification_id, student_id)
);

-- 4. Student Settings
CREATE TABLE IF NOT EXISTS student_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    dark_mode BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Module completion tracking
CREATE TABLE IF NOT EXISTS student_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Current', 'Completed')),
    started_at DATE,
    completed_at DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, module_id)
);

-- 6. Row Level Security
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_modules ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated access
CREATE POLICY "Authenticated all attendance" ON attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all student_notifications" ON student_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all student_settings" ON student_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all student_modules" ON student_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read for student login (students table)
CREATE POLICY "Public select students for login" ON students FOR SELECT TO anon USING (true);

-- 7. Simple password hash function (for demo - use proper hashing in production)
CREATE OR REPLACE FUNCTION hash_password(pwd TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(sha256(pwd::bytea), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 8. Verify student password function
CREATE OR REPLACE FUNCTION verify_student_login(p_code TEXT, p_password TEXT)
RETURNS TABLE(student_id UUID, student_name TEXT, student_status TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.full_name, s.status
    FROM students s
    WHERE s.student_code = p_code
    AND s.password_hash = encode(sha256(p_password::bytea), 'hex')
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Set default password for existing students (student code as initial password)
UPDATE students SET password_hash = encode(sha256(student_code::bytea), 'hex') WHERE password_hash = '' OR password_hash IS NULL;
