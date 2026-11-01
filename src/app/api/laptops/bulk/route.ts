import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';
import { v4 as uuidv4 } from 'uuid';

// PUT /api/laptops/bulk - Bulk update status or location
export async function PUT(request: NextRequest) {
  const { session, error: authError } = await requireRole('editor');
  if (authError) return authError;

  const body = await request.json();
  const { laptop_ids, field, value } = body;

  if (!laptop_ids || !Array.isArray(laptop_ids) || laptop_ids.length === 0) {
    return NextResponse.json({ error: 'No laptops selected' }, { status: 400 });
  }

  if (!field || !['status', 'location'].includes(field)) {
    return NextResponse.json({ error: 'Field must be status or location' }, { status: 400 });
  }

  if (!value) {
    return NextResponse.json({ error: 'Value is required' }, { status: 400 });
  }

  const batchId = uuidv4();

  // Get current values for audit
  const { data: currentLaptops, error: fetchError } = await supabase
    .from('laptops')
    .select('id, id_no, status, location')
    .in('id', laptop_ids)
    .eq('is_deleted', false);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Create audit entries
  const auditEntries = currentLaptops
    ?.filter((laptop) => laptop[field as 'status' | 'location'] !== value)
    .map((laptop) => ({
      laptop_id: laptop.id,
      laptop_id_no: laptop.id_no,
      action: 'bulk_update' as const,
      field_name: field,
      old_value: laptop[field as 'status' | 'location'],
      new_value: value,
      performed_by: session!.user.id,
      batch_id: batchId,
    }));

  // Update all laptops
  const { error: updateError } = await supabase
    .from('laptops')
    .update({ [field]: value, updated_by: session!.user.id })
    .in('id', laptop_ids)
    .eq('is_deleted', false);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log audit entries
  if (auditEntries && auditEntries.length > 0) {
    await supabase.from('audit_log').insert(auditEntries);
  }

  return NextResponse.json({
    success: true,
    updated: auditEntries?.length || 0,
    message: `Updated ${auditEntries?.length || 0} laptop(s)`,
  });
}
