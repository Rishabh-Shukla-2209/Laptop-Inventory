import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

const VALID_STATUSES = ['Board', 'Part', 'Paint', 'Polarisation', 'Ready'];
const VALID_LOCATIONS = ['In Stock', 'Sold', 'Rent', 'Repair', 'Paint', 'Polarisation', 'Scrap'];
const VALID_STORAGE_TYPES = ['SSD', 'HDD', 'NVMe', 'eMMC', 'None'];
const VALID_SCREENS = ['Touch', 'Non-Touch'];

// Column name mapping (flexible import headers)
const COLUMN_MAP: Record<string, string> = {
  'id no': 'id_no', 'id_no': 'id_no', 'idno': 'id_no', 'id': 'id_no',
  'serial no': 'serial_no', 'serial_no': 'serial_no', 'serialno': 'serial_no', 'serial': 'serial_no',
  'mis': 'mis',
  'make': 'make', 'brand': 'make',
  'model': 'model',
  'processor': 'processor', 'cpu': 'processor',
  'generation': 'generation', 'gen': 'generation',
  'ram': 'ram_gb', 'ram_gb': 'ram_gb', 'ram (gb)': 'ram_gb',
  'storage 1 type': 'storage1_type', 'storage1_type': 'storage1_type', 'storage1 type': 'storage1_type',
  'storage 1 size': 'storage1_size_gb', 'storage1_size_gb': 'storage1_size_gb', 'storage1 size': 'storage1_size_gb', 'storage 1 size (gb)': 'storage1_size_gb',
  'storage 2 type': 'storage2_type', 'storage2_type': 'storage2_type', 'storage2 type': 'storage2_type',
  'storage 2 size': 'storage2_size_gb', 'storage2_size_gb': 'storage2_size_gb', 'storage2 size': 'storage2_size_gb', 'storage 2 size (gb)': 'storage2_size_gb',
  'screen': 'screen', 'screen type': 'screen',
  'graphic card': 'graphic_card', 'graphic_card': 'graphic_card', 'gpu': 'graphic_card', 'graphics': 'graphic_card',
  'status': 'status',
  'location': 'location',
  'checked by': 'checked_by', 'checked_by': 'checked_by',
  'remark': 'remark', 'remarks': 'remark', 'notes': 'remark',
};

// POST /api/laptops/import - Import from CSV
export async function POST(request: NextRequest) {
  const { session, error: authError } = await requireRole('editor');
  if (authError) return authError;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const mode = formData.get('mode') as string || 'preview'; // 'preview' or 'commit'

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const text = await file.text();

  // Parse CSV
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => {
      const normalized = header.trim().toLowerCase();
      return COLUMN_MAP[normalized] || normalized;
    },
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json({
      error: 'CSV parsing errors',
      details: parsed.errors.slice(0, 10),
    }, { status: 400 });
  }

  const rows = parsed.data as Record<string, string>[];

  // Get existing id_nos
  const { data: existingLaptops } = await supabase
    .from('laptops')
    .select('id_no')
    .eq('is_deleted', false);

  const existingIdNos = new Set(existingLaptops?.map((l) => l.id_no) || []);

  // Get existing serial_nos for warnings
  const { data: existingSerials } = await supabase
    .from('laptops')
    .select('serial_no, id_no')
    .eq('is_deleted', false)
    .not('serial_no', 'is', null);

  const serialToIdNo: Record<string, string[]> = {};
  existingSerials?.forEach((l) => {
    if (l.serial_no) {
      if (!serialToIdNo[l.serial_no]) serialToIdNo[l.serial_no] = [];
      serialToIdNo[l.serial_no].push(l.id_no);
    }
  });

  // Track id_nos within the import itself for intra-file duplicates
  const importIdNos = new Set<string>();

  // Validate each row
  const preview = rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!row.id_no?.trim()) errors.push('ID No is required');
    if (!row.make?.trim()) errors.push('Make is required');
    if (!row.model?.trim()) errors.push('Model is required');

    // Duplicate id_no check
    if (row.id_no?.trim()) {
      if (existingIdNos.has(row.id_no.trim())) {
        errors.push(`ID No "${row.id_no.trim()}" already exists in database`);
      }
      if (importIdNos.has(row.id_no.trim())) {
        errors.push(`ID No "${row.id_no.trim()}" is duplicated in import file`);
      }
      importIdNos.add(row.id_no.trim());
    }

    // Serial no duplicate warning
    if (row.serial_no?.trim() && serialToIdNo[row.serial_no.trim()]) {
      warnings.push(`Serial No exists on: ${serialToIdNo[row.serial_no.trim()].join(', ')}`);
    }

    // Validate enums
    if (row.status?.trim() && !VALID_STATUSES.includes(row.status.trim())) {
      errors.push(`Invalid status: "${row.status.trim()}". Must be: ${VALID_STATUSES.join(', ')}`);
    }
    if (row.location?.trim() && !VALID_LOCATIONS.includes(row.location.trim())) {
      errors.push(`Invalid location: "${row.location.trim()}". Must be: ${VALID_LOCATIONS.join(', ')}`);
    }
    if (row.storage1_type?.trim() && !VALID_STORAGE_TYPES.includes(row.storage1_type.trim())) {
      errors.push(`Invalid storage 1 type: "${row.storage1_type.trim()}"`);
    }
    if (row.storage2_type?.trim() && !VALID_STORAGE_TYPES.includes(row.storage2_type.trim())) {
      errors.push(`Invalid storage 2 type: "${row.storage2_type.trim()}"`);
    }
    if (row.screen?.trim() && !VALID_SCREENS.includes(row.screen.trim())) {
      errors.push(`Invalid screen type: "${row.screen.trim()}". Must be Touch or Non-Touch`);
    }

    // Validate numbers
    if (row.generation?.trim() && isNaN(parseInt(row.generation))) {
      errors.push('Generation must be a number');
    }
    if (row.ram_gb?.trim() && isNaN(parseInt(row.ram_gb))) {
      errors.push('RAM must be a number');
    }

    return {
      row_number: index + 1,
      data: {
        id_no: row.id_no?.trim() || '',
        serial_no: row.serial_no?.trim() || null,
        mis: row.mis?.trim() || null,
        make: row.make?.trim() || '',
        model: row.model?.trim() || '',
        processor: row.processor?.trim() || null,
        generation: row.generation?.trim() ? parseInt(row.generation) : null,
        ram_gb: row.ram_gb?.trim() ? parseInt(row.ram_gb) : null,
        storage1_type: row.storage1_type?.trim() || null,
        storage1_size_gb: row.storage1_size_gb?.trim() ? parseInt(row.storage1_size_gb) : null,
        storage2_type: row.storage2_type?.trim() || null,
        storage2_size_gb: row.storage2_size_gb?.trim() ? parseInt(row.storage2_size_gb) : null,
        screen: row.screen?.trim() || null,
        graphic_card: row.graphic_card?.trim() || null,
        status: row.status?.trim() || 'Board',
        location: row.location?.trim() || 'In Stock',
        remark: row.remark?.trim() || null,
      },
      errors,
      warnings,
      is_valid: errors.length === 0,
    };
  });

  if (mode === 'preview') {
    const validCount = preview.filter((r) => r.is_valid).length;
    const errorCount = preview.filter((r) => !r.is_valid).length;
    return NextResponse.json({
      preview,
      summary: { total: preview.length, valid: validCount, errors: errorCount },
    });
  }

  // Commit mode - insert valid rows
  const validRows = preview.filter((r) => r.is_valid);
  if (validRows.length === 0) {
    return NextResponse.json({ error: 'No valid rows to import' }, { status: 400 });
  }

  const batchId = uuidv4();
  const insertData = validRows.map((row) => ({
    id: uuidv4(),
    ...row.data,
    created_by: session!.user.id,
    updated_by: session!.user.id,
  }));

  const { error: insertError } = await supabase
    .from('laptops')
    .insert(insertData);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Log audit entries for import
  const auditEntries = insertData.map((laptop) => ({
    laptop_id: laptop.id,
    laptop_id_no: laptop.id_no,
    action: 'import' as const,
    snapshot: laptop,
    performed_by: session!.user.id,
    batch_id: batchId,
  }));

  await supabase.from('audit_log').insert(auditEntries);

  // Auto-add new makes/models
  const makes = new Set(validRows.map((r) => r.data.make).filter(Boolean));
  const models = new Set(validRows.map((r) => `${r.data.model}|||${r.data.make}`).filter(Boolean));

  for (const make of makes) {
    await autoAddDropdown('make', make as string);
  }
  for (const modelMake of models) {
    const [model, make] = (modelMake as string).split('|||');
    await autoAddDropdown('model', model, make);
  }

  return NextResponse.json({
    success: true,
    imported: validRows.length,
    skipped: preview.length - validRows.length,
    message: `Imported ${validRows.length} laptop(s)`,
  });
}

async function autoAddDropdown(category: string, value: string, parent?: string) {
  const { data: existing } = await supabase
    .from('dropdown_options')
    .select('id')
    .eq('category', category)
    .eq('value', value)
    .single();

  if (!existing) {
    await supabase.from('dropdown_options').insert({
      category,
      value,
      parent_value: parent || null,
      sort_order: 999,
    });
  }
}
