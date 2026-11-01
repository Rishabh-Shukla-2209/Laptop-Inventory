import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';
import { v4 as uuidv4 } from 'uuid';

// GET /api/laptops/[id] - Get a single laptop
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireRole('viewer');
  if (authError) return authError;

  const { id } = await params;

  const { data, error } = await supabase
    .from('laptops')
    .select('*, checked_by_user:users!laptops_checked_by_fkey(name)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Laptop not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...data,
    checked_by_name: data.checked_by_user?.name || null,
    checked_by_user: undefined,
  });
}

// PUT /api/laptops/[id] - Update a laptop
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireRole('editor');
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  // Get current laptop state
  const { data: current, error: fetchError } = await supabase
    .from('laptops')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Laptop not found' }, { status: 404 });
  }

  const batchId = uuidv4();
  const auditEntries: Array<{
    laptop_id: string;
    laptop_id_no: string;
    action: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    performed_by: string;
    batch_id: string;
  }> = [];

  // Track changes
  const updatableFields = [
    'id_no', 'serial_no', 'mis', 'make', 'model', 'processor', 'generation',
    'ram_gb', 'storage1_type', 'storage1_size_gb', 'storage2_type', 'storage2_size_gb',
    'screen', 'graphic_card', 'status', 'location', 'checked_by', 'remark',
  ];

  const updates: Record<string, unknown> = { updated_by: session!.user.id };

  for (const field of updatableFields) {
    if (body[field] !== undefined && String(body[field] ?? '') !== String(current[field] ?? '')) {
      updates[field] = body[field] === '' ? null : body[field];
      auditEntries.push({
        laptop_id: id,
        laptop_id_no: current.id_no,
        action: 'update',
        field_name: field,
        old_value: current[field] != null ? String(current[field]) : null,
        new_value: body[field] != null && body[field] !== '' ? String(body[field]) : null,
        performed_by: session!.user.id,
        batch_id: batchId,
      });
    }
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ message: 'No changes detected' });
  }

  // Check serial_no duplicate warning
  let serialWarning = '';
  if (updates.serial_no && updates.serial_no !== current.serial_no) {
    const { data: existingSerial } = await supabase
      .from('laptops')
      .select('id_no')
      .eq('serial_no', updates.serial_no as string)
      .eq('is_deleted', false)
      .neq('id', id);

    if (existingSerial && existingSerial.length > 0) {
      serialWarning = `Warning: Serial No already exists on: ${existingSerial.map((l) => l.id_no).join(', ')}`;
    }
  }

  const { data, error } = await supabase
    .from('laptops')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'ID No already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit entries
  if (auditEntries.length > 0) {
    await supabase.from('audit_log').insert(auditEntries);
  }

  // Auto-add new make/model
  if (updates.make) await autoAddDropdown('make', updates.make as string);
  if (updates.model) await autoAddDropdown('model', updates.model as string, (updates.make || current.make) as string);

  return NextResponse.json({ data, warning: serialWarning || undefined });
}

// DELETE /api/laptops/[id] - Hard delete with snapshot
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireRole('editor');
  if (authError) return authError;

  const { id } = await params;

  // Get current state for snapshot
  const { data: current, error: fetchError } = await supabase
    .from('laptops')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Laptop not found' }, { status: 404 });
  }

  const batchId = uuidv4();

  // Log deletion with full snapshot
  await supabase.from('audit_log').insert({
    laptop_id: id,
    laptop_id_no: current.id_no,
    action: 'delete',
    snapshot: current,
    performed_by: session!.user.id,
    batch_id: batchId,
  });

  // Soft delete (mark as deleted)
  const { error } = await supabase
    .from('laptops')
    .update({ is_deleted: true, updated_by: session!.user.id })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
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
