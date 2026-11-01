-- ============================================================
-- Laptop Inventory Management System — Initial Schema
-- ============================================================

-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

-- 2. USERS TABLE
-- ============================================================

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'viewer',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

-- 3. DROPDOWN OPTIONS TABLE
-- ============================================================

CREATE TABLE dropdown_options (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL,  -- 'make', 'model', 'status', 'location', 'storage_type', 'screen'
  value       TEXT NOT NULL,
  parent_value TEXT,          -- e.g., model's parent is make
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (category, value)
);

CREATE INDEX idx_dropdown_category ON dropdown_options (category, is_active);

-- 4. LAPTOPS TABLE
-- ============================================================

CREATE TABLE laptops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_no           TEXT UNIQUE NOT NULL,
  serial_no       TEXT,
  mis             TEXT,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  processor       TEXT,
  generation      INT,
  ram_gb          INT,
  storage1_type   TEXT,
  storage1_size_gb INT,
  storage2_type   TEXT,
  storage2_size_gb INT,
  screen          TEXT CHECK (screen IN ('Touch', 'Non-Touch')),
  graphic_card    TEXT,
  status          TEXT NOT NULL DEFAULT 'Board'
                    CHECK (status IN ('Board', 'Part', 'Paint', 'Polarisation', 'Ready')),
  location        TEXT NOT NULL DEFAULT 'In Stock'
                    CHECK (location IN ('In Stock', 'Sold', 'Rent', 'Repair', 'Paint', 'Polarisation', 'Scrap')),
  checked_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  remark          TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_laptops_id_no ON laptops (id_no);
CREATE INDEX idx_laptops_serial_no ON laptops (serial_no) WHERE serial_no IS NOT NULL;
CREATE INDEX idx_laptops_status ON laptops (status) WHERE NOT is_deleted;
CREATE INDEX idx_laptops_location ON laptops (location) WHERE NOT is_deleted;
CREATE INDEX idx_laptops_make ON laptops (make) WHERE NOT is_deleted;
CREATE INDEX idx_laptops_model ON laptops (model) WHERE NOT is_deleted;
CREATE INDEX idx_laptops_generation ON laptops (generation) WHERE NOT is_deleted;
CREATE INDEX idx_laptops_is_deleted ON laptops (is_deleted);
CREATE INDEX idx_laptops_make_model ON laptops (make, model) WHERE NOT is_deleted;

-- 5. AUDIT LOG TABLE
-- ============================================================

CREATE TABLE audit_log (
  id            BIGSERIAL PRIMARY KEY,
  laptop_id     UUID,  -- nullable: laptop might be deleted
  laptop_id_no  TEXT,  -- denormalized for display after deletion
  action        TEXT NOT NULL
                  CHECK (action IN ('create', 'update', 'delete', 'restore', 'rollback', 'import', 'bulk_update')),
  field_name    TEXT,
  old_value     TEXT,
  new_value     TEXT,
  snapshot      JSONB,  -- full laptop snapshot on delete
  performed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  batch_id      UUID NOT NULL DEFAULT gen_random_uuid(),
  is_rollback   BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_audit_laptop_id ON audit_log (laptop_id);
CREATE INDEX idx_audit_performed_by ON audit_log (performed_by);
CREATE INDEX idx_audit_performed_at ON audit_log (performed_at DESC);
CREATE INDEX idx_audit_batch_id ON audit_log (batch_id);
CREATE INDEX idx_audit_action ON audit_log (action);

-- 6. SEED DATA: DROPDOWN OPTIONS
-- ============================================================

-- Statuses (priority order)
INSERT INTO dropdown_options (category, value, sort_order) VALUES
  ('status', 'Board', 1),
  ('status', 'Part', 2),
  ('status', 'Paint', 3),
  ('status', 'Polarisation', 4),
  ('status', 'Ready', 5);

-- Locations
INSERT INTO dropdown_options (category, value, sort_order) VALUES
  ('location', 'In Stock', 1),
  ('location', 'Sold', 2),
  ('location', 'Rent', 3),
  ('location', 'Repair', 4),
  ('location', 'Paint', 5),
  ('location', 'Polarisation', 6),
  ('location', 'Scrap', 7);

-- Storage types
INSERT INTO dropdown_options (category, value, sort_order) VALUES
  ('storage_type', 'SSD', 1),
  ('storage_type', 'HDD', 2),
  ('storage_type', 'NVMe', 3),
  ('storage_type', 'eMMC', 4),
  ('storage_type', 'None', 5);

-- Screen types
INSERT INTO dropdown_options (category, value, sort_order) VALUES
  ('screen', 'Touch', 1),
  ('screen', 'Non-Touch', 2);

-- Sample makes
INSERT INTO dropdown_options (category, value, sort_order) VALUES
  ('make', 'Dell', 1),
  ('make', 'HP', 2),
  ('make', 'Lenovo', 3),
  ('make', 'Apple', 4),
  ('make', 'Asus', 5),
  ('make', 'Acer', 6),
  ('make', 'MSI', 7),
  ('make', 'Samsung', 8);

-- 7. SEED DEFAULT ADMIN USER (password: admin123)
-- ============================================================
-- bcrypt hash for 'admin123': $2b$10$rQEY6n9K8lGGRlSd5v5.0OZl4jGHv9x5x5v5v5v5v5v5v5v5v5v5
-- NOTE: Replace this hash with a real bcrypt hash generated at runtime.
-- The application will seed this on first run if no admin exists.

-- 8. FUNCTION: UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_laptops_updated_at
  BEFORE UPDATE ON laptops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. ROW LEVEL SECURITY (optional, app-level auth is primary)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE laptops ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropdown_options ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by the Next.js backend)
CREATE POLICY "Service role full access on users"
  ON users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on laptops"
  ON laptops FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on audit_log"
  ON audit_log FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on dropdown_options"
  ON dropdown_options FOR ALL USING (true) WITH CHECK (true);
