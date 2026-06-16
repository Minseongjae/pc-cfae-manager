-- 1% PC&CAFE Manager — Supabase schema
-- Run in Supabase Dashboard → SQL Editor → New query → Run

CREATE TABLE IF NOT EXISTS employees (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  hourly_wage INTEGER NOT NULL DEFAULT 0,
  phone TEXT NOT NULL DEFAULT '',
  hire_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'working',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_shifts (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  row_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schedule_shifts_date_idx
  ON schedule_shifts (year, month, day);

CREATE TABLE IF NOT EXISTS actual_work_records (
  id TEXT PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  shift_id TEXT,
  scheduled_start TEXT NOT NULL,
  scheduled_end TEXT NOT NULL,
  actual_start TEXT,
  actual_end TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  modification_reason TEXT,
  is_manually_edited BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS actual_work_records_date_idx
  ON actual_work_records (date);

CREATE TABLE IF NOT EXISTS payroll_adjustment_records (
  employee_id BIGINT NOT NULL,
  period TEXT NOT NULL,
  period_key TEXT NOT NULL,
  adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, period_key)
);

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_token TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_state (id, app_settings, sync_token)
VALUES (1, '{}'::jsonb, '')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_employees" ON employees;
CREATE POLICY "anon_all_employees" ON employees
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_schedule_shifts" ON schedule_shifts;
CREATE POLICY "anon_all_schedule_shifts" ON schedule_shifts
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_actual_work_records" ON actual_work_records;
CREATE POLICY "anon_all_actual_work_records" ON actual_work_records
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_payroll_adjustment_records" ON payroll_adjustment_records;
CREATE POLICY "anon_all_payroll_adjustment_records" ON payroll_adjustment_records
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_app_state" ON app_state;
CREATE POLICY "anon_all_app_state" ON app_state
  FOR ALL TO anon USING (true) WITH CHECK (true);
