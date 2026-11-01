// ============================================================
// Shared type definitions for the Laptop Inventory System
// ============================================================

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface DropdownOption {
  id: number;
  category: string;
  value: string;
  parent_value?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type StorageType = 'SSD' | 'HDD' | 'NVMe' | 'eMMC' | 'None';
export type ScreenType = 'Touch' | 'Non-Touch';
export type LaptopStatus = 'Board' | 'Part' | 'Paint' | 'Polarisation' | 'Ready';
export type LaptopLocation = 'In Stock' | 'Sold' | 'Rent' | 'Repair' | 'Paint' | 'Polarisation' | 'Scrap';

export interface Laptop {
  id: string;
  id_no: string;
  serial_no: string | null;
  mis: string | null;
  make: string;
  model: string;
  processor: string | null;
  generation: number | null;
  ram_gb: number | null;
  storage1_type: StorageType | null;
  storage1_size_gb: number | null;
  storage2_type: StorageType | null;
  storage2_size_gb: number | null;
  screen: ScreenType | null;
  graphic_card: string | null;
  status: LaptopStatus;
  location: LaptopLocation;
  checked_by: string | null;
  checked_by_name?: string | null;
  remark: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'rollback' | 'import' | 'bulk_update';

export interface AuditLogEntry {
  id: number;
  laptop_id: string | null;
  laptop_id_no: string | null;
  action: AuditAction;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  snapshot: Laptop | null;
  performed_by: string | null;
  performer_name?: string | null;
  performed_at: string;
  batch_id: string;
  is_rollback: boolean;
}

export interface LaptopFilters {
  search?: string;
  make?: string;
  model?: string;
  status?: LaptopStatus;
  location?: LaptopLocation;
  generation?: number;
  screen?: ScreenType;
  checked_by?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  group_by?: 'none' | 'generation' | 'model' | 'make' | 'status' | 'location';
}

export interface DashboardStats {
  total: number;
  by_status: Record<string, number>;
  by_location: Record<string, number>;
  by_make: Record<string, number>;
  by_generation: Record<string, number>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ImportPreviewRow {
  row_number: number;
  data: Partial<Laptop>;
  errors: string[];
  warnings: string[];
  is_valid: boolean;
}

export interface BulkEditPayload {
  laptop_ids: string[];
  field: 'status' | 'location';
  value: string;
}
