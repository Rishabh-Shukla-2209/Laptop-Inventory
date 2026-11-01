import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';
import { v4 as uuidv4 } from 'uuid';

// GET /api/audit-log - View audit history
export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const params = request.nextUrl.searchParams;
  const laptop_id = params.get('laptop_id') || '';
  const action = params.get('action') || '';
  const performed_by = params.get('performed_by') || '';
  const from_date = params.get('from_date') || '';
  const to_date = params.get('to_date') || '';
  const page = parseInt(params.get('page') || '1');
  const per_page = parseInt(params.get('per_page') || '50');

  let query = supabase
    .from('audit_log')
    .select('*, performer:users!audit_log_performed_by_fkey(name)', { count: 'exact' })
    .order('performed_at', { ascending: false });

  if (laptop_id) query = query.eq('laptop_id', laptop_id);
  if (action) query = query.eq('action', action);
  if (performed_by) query = query.eq('performed_by', performed_by);
  if (from_date) query = query.gte('performed_at', from_date);
  if (to_date) query = query.lte('performed_at', to_date);

  const from = (page - 1) * per_page;
  const to = from + per_page - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transformed = data?.map((entry) => ({
    ...entry,
    performer_name: entry.performer?.name || null,
    performer: undefined,
  }));

  return NextResponse.json({
    data: transformed || [],
    total: count || 0,
    page,
    per_page,
    total_pages: Math.ceil((count || 0) / per_page),
  });
}

// POST /api/audit-log/rollback - Rollback a change
export async function POST(request: NextRequest) {
  const { session, error: authError } = await requireRole('admin');
  if (authError) return authError;

  const body = await request.json();
  const { entry_id, mode } = body; // mode: 'single' | 'batch'

  if (!entry_id) {
    return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
  }

  // Get the audit entry
  const { data: entry, error: fetchError } = await supabase
    .from('audit_log')
    .select('*')
    .eq('id', entry_id)
    .single();

  if (fetchError || !entry) {
    return NextResponse.json({ error: 'Audit entry not found' }, { status: 404 });
  }

  const rollbackBatchId = uuidv4();

  if (entry.action === 'delete' && entry.snapshot) {
    // Restore deleted laptop
    const snapshot = entry.snapshot as Record<string, unknown>;
    const restoreData: Record<string, unknown> = { ...snapshot, is_deleted: false, updated_by: session!.user.id };
    delete restoreData.checked_by_user;

    const { error: restoreError } = await supabase
      .from('laptops')
      .upsert(restoreData);

    if (restoreError) {
      return NextResponse.json({ error: restoreError.message }, { status: 500 });
    }

    // Log the restore
    await supabase.from('audit_log').insert({
      laptop_id: entry.laptop_id,
      laptop_id_no: entry.laptop_id_no,
      action: 'restore',
      snapshot: snapshot,
      performed_by: session!.user.id,
      batch_id: rollbackBatchId,
      is_rollback: true,
    });

    return NextResponse.json({ success: true, message: 'Laptop restored successfully' });
  }

  if (entry.action === 'update' || entry.action === 'bulk_update') {
    if (!entry.laptop_id || !entry.field_name) {
      return NextResponse.json({ error: 'Cannot rollback this entry' }, { status: 400 });
    }

    // Check if the field has been modified since this change
    const { data: laterChanges } = await supabase
      .from('audit_log')
      .select('*')
      .eq('laptop_id', entry.laptop_id)
      .eq('field_name', entry.field_name)
      .gt('performed_at', entry.performed_at)
      .order('performed_at', { ascending: false })
      .limit(1);

    if (laterChanges && laterChanges.length > 0) {
      // Warn about later changes, but still allow rollback
      const warning = `Warning: This field was modified again on ${new Date(laterChanges[0].performed_at).toLocaleString()} by another user.`;

      if (mode !== 'force') {
        return NextResponse.json({
          warning,
          conflict: true,
          later_change: laterChanges[0],
        }, { status: 409 });
      }
    }

    // Get current value for the rollback audit entry
    const { data: currentLaptop } = await supabase
      .from('laptops')
      .select(entry.field_name)
      .eq('id', entry.laptop_id)
      .single();

    // Rollback: set the field to old_value
    const { error: rollbackError } = await supabase
      .from('laptops')
      .update({
        [entry.field_name]: entry.old_value,
        updated_by: session!.user.id,
      })
      .eq('id', entry.laptop_id);

    if (rollbackError) {
      return NextResponse.json({ error: rollbackError.message }, { status: 500 });
    }

    // Log the rollback
    await supabase.from('audit_log').insert({
      laptop_id: entry.laptop_id,
      laptop_id_no: entry.laptop_id_no,
      action: 'rollback',
      field_name: entry.field_name,
      old_value: currentLaptop?.[entry.field_name] != null ? String(currentLaptop[entry.field_name]) : null,
      new_value: entry.old_value,
      performed_by: session!.user.id,
      batch_id: rollbackBatchId,
      is_rollback: true,
    });

    return NextResponse.json({ success: true, message: 'Change rolled back successfully' });
  }

  return NextResponse.json({ error: 'Cannot rollback this type of entry' }, { status: 400 });
}
