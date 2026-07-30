-- ============================================================
-- Globus Technical Academy ERP v1.00
-- Database Schema Additions — Part 3: Teacher Portal
-- ============================================================

-- 1. Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    password_hash TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    qualification TEXT DEFAULT '',
    specialization TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teachers_code ON teachers(teacher_code);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);

-- 2. Teacher-Student Assignments
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON teacher_assignments(student_id);

-- 3. Student Performance Notes
CREATE TABLE IF NOT EXISTS student_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    academic_progress TEXT DEFAULT '',
    practical_skills TEXT DEFAULT '',
    behaviour TEXT DEFAULT '',
    attendance_remarks TEXT DEFAULT '',
    followup_notes TEXT DEFAULT '',
    note_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_student ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_teacher ON student_notes(teacher_id);

-- 4. Module Progress History
CREATE TABLE IF NOT EXISTS module_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    previous_module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    change_type TEXT DEFAULT 'progress' CHECK (change_type IN ('progress', 'completed', 'reset')),
    remarks TEXT DEFAULT '',
    changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_module_history_student ON module_history(student_id);

-- 5. Teacher Notifications
CREATE TABLE IF NOT EXISTS teacher_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    UNIQUE(notification_id, teacher_id)
);

-- 6. Teacher Settings
CREATE TABLE IF NOT EXISTS teacher_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID UNIQUE NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    dark_mode BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Row Level Security
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated all teachers" ON teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all teacher_assignments" ON teacher_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all student_notes" ON student_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all module_history" ON module_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all teacher_notifications" ON teacher_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all teacher_settings" ON teacher_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read for teacher login
CREATE POLICY "Public select teachers for login" ON teachers FOR SELECT TO anon USING (true);

-- 8. Generate teacher code function
CREATE OR REPLACE FUNCTION generate_teacher_code()
RETURNS TEXT AS $$
DECLARE
    next_num INT;
    code TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(teacher_code FROM 4) AS INT)), 0) + 1
    INTO next_num
    FROM teachers;
    code := 'TCH' || LPAD(next_num::TEXT, 3, '0');
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 9. Verify teacher login function
CREATE OR REPLACE FUNCTION verify_teacher_login(p_code TEXT, p_password TEXT)
RETURNS TABLE(teacher_id UUID, teacher_name TEXT, is_active BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.full_name, t.is_active
    FROM teachers t
    WHERE (t.teacher_code = p_code OR t.email = p_code)
    AND t.password_hash = encode(sha256(p_password::bytea), 'hex')
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Updated_at trigger for teachers
CREATE TRIGGER trg_teachers_updated
    BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 11. Set default password for teachers (teacher code as initial password)
-- Run after inserting teachers
-- UPDATE teachers SET password_hash = encode(sha256(teacher_code::bytea), 'hex') WHERE password_hash = '' OR password_hash IS NULL;
