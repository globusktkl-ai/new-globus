-- ============================================================
-- Globus Technical Academy ERP v1.00
-- Database Schema Additions — Part 4: Admin Portal & Enterprise
-- ============================================================

-- 1. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_role TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    module TEXT,
    record_id UUID,
    record_type TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- 2. Backup History
CREATE TABLE IF NOT EXISTS backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'students', 'fees', 'settings', 'manual')),
    file_name TEXT,
    file_size BIGINT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

-- 3. Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    module TEXT NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role, module)
);

-- Insert default permissions
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('admin', 'students', true, true, true, true),
('admin', 'teachers', true, true, true, true),
('admin', 'office_users', true, true, true, true),
('admin', 'courses', true, true, true, true),
('admin', 'modules', true, true, true, true),
('admin', 'fees', true, true, true, true),
('admin', 'reports', true, true, true, true),
('admin', 'settings', true, true, true, true),
('admin', 'notifications', true, true, true, true),
('admin', 'backup', true, true, true, true),
('office', 'students', true, true, true, false),
('office', 'fees', true, true, true, false),
('office', 'reports', true, false, false, false),
('teacher', 'students', true, false, false, false),
('teacher', 'attendance', true, true, true, false),
('teacher', 'modules', true, false, true, false)
ON CONFLICT (role, module) DO NOTHING;

-- 4. Login History
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_type TEXT CHECK (user_type IN ('admin', 'office', 'teacher', 'student')),
    user_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at);

-- 5. Scheduled Notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT,
    target_role TEXT DEFAULT 'all',
    target_users UUID[],
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Receipt Templates
CREATE TABLE IF NOT EXISTS receipt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    header_text TEXT,
    footer_text TEXT,
    terms_text TEXT,
    show_logo BOOLEAN DEFAULT true,
    show_qr BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. System Settings (extended)
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS receipt_prefix TEXT DEFAULT 'RCP';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS student_code_prefix TEXT DEFAULT 'GTA';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS teacher_code_prefix TEXT DEFAULT 'TCH';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS session_timeout INT DEFAULT 30;
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS max_login_attempts INT DEFAULT 5;
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS enable_notifications BOOLEAN DEFAULT true;
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS enable_sms BOOLEAN DEFAULT false;
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS enable_email BOOLEAN DEFAULT true;
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS backup_frequency TEXT DEFAULT 'weekly';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'light';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#2d5f8a';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS receipt_header TEXT DEFAULT '';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'Thank you for your payment';
ALTER TABLE institute_settings ADD COLUMN IF NOT EXISTS certificate_header TEXT DEFAULT '';

-- 8. Financial Summary (monthly cache)
CREATE TABLE IF NOT EXISTS financial_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE NOT NULL,
    total_collection NUMERIC(12,2) DEFAULT 0,
    cash_collection NUMERIC(12,2) DEFAULT 0,
    upi_collection NUMERIC(12,2) DEFAULT 0,
    card_collection NUMERIC(12,2) DEFAULT 0,
    bank_collection NUMERIC(12,2) DEFAULT 0,
    admission_revenue NUMERIC(12,2) DEFAULT 0,
    pending_fees NUMERIC(12,2) DEFAULT 0,
    new_admissions INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(month)
);

-- 9. RLS Policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated all activity_logs" ON activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all backup_history" ON backup_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all role_permissions" ON role_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all login_history" ON login_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all scheduled_notifications" ON scheduled_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all receipt_templates" ON receipt_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated all financial_summary" ON financial_summary FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. Activity Log Function
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_user_role TEXT,
    p_user_name TEXT,
    p_action TEXT,
    p_module TEXT,
    p_record_id UUID DEFAULT NULL,
    p_record_type TEXT DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO activity_logs (user_id, user_role, user_name, action, module, record_id, record_type, old_value, new_value)
    VALUES (p_user_id, p_user_role, p_user_name, p_action, p_module, p_record_id, p_record_type, p_old_value, p_new_value)
    RETURNING id INTO log_id;
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Calculate Monthly Summary Function
CREATE OR REPLACE FUNCTION calculate_monthly_summary(p_month DATE)
RETURNS VOID AS $$
DECLARE
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := date_trunc('month', p_month);
    end_date := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::DATE;
    
    INSERT INTO financial_summary (month, total_collection, cash_collection, upi_collection, card_collection, bank_collection, admission_revenue, new_admissions)
    SELECT 
        start_date,
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'Card' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'Bank Transfer' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN is_admission_fee = true THEN amount ELSE 0 END), 0),
        (SELECT COUNT(*) FROM students WHERE admission_date BETWEEN start_date AND end_date)
    FROM fee_payments
    WHERE payment_date BETWEEN start_date AND end_date
    ON CONFLICT (month) DO UPDATE SET
        total_collection = EXCLUDED.total_collection,
        cash_collection = EXCLUDED.cash_collection,
        upi_collection = EXCLUDED.upi_collection,
        card_collection = EXCLUDED.card_collection,
        bank_collection = EXCLUDED.bank_collection,
        admission_revenue = EXCLUDED.admission_revenue,
        new_admissions = EXCLUDED.new_admissions;
END;
$$ LANGUAGE plpgsql;
