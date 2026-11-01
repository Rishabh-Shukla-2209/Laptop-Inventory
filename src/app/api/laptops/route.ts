import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';
import { v4 as uuidv4 } from 'uuid';

// GET /api/laptops - List laptops with filters, search, sort, pagination
export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('viewer');
  if (authError) return authError;

  const params = request.nextUrl.searchParams;
  const search = params.get('search') || '';
  const make = params.get('make') || '';
  const model = params.get('model') || '';
  const status = params.get('status') || '';
  const location = params.get('location') || '';
  const generation = params.get('generation') || '';
  const screen = params.get('screen') || '';
  const checked_by = params.get('checked_by') || '';
  const page = parseInt(params.get('page') || '1');
  const per_page = parseInt(params.get('per_page') || '25');
  const sort_by = params.get('sort_by') || 'created_at';
  const sort_dir = params.get('sort_dir') === 'asc' ? true : false;
  const group_by = params.get('group_by') || 'none';
  const show_deleted = params.get('show_deleted') === 'true';

  let query = supabase
    .from('laptops')
    .select('*, checked_by_user:users!laptops_checked_by_fkey(name)', { count: 'exact' });

  if (!show_deleted) {
    query = query.eq('is_deleted', false);
  }

  // Filters
  if (search) {
    query = query.or(
      `id_no.ilike.%${search}%,serial_no.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%,processor.ilike.%${search}%,remark.ilike.%${search}%`
    );
  }
  if (make) query = query.eq('make', make);
  if (model) query = query.eq('model', model);
  if (status) query = query.eq('status', status);
  if (location) query = query.eq('location', location);
  if (generation) query = query.eq('generation', parseInt(generation));
  if (screen) query = query.eq('screen', screen);
  if (checked_by) query = query.eq('checked_by', checked_by);

  // Sorting
  const validSortColumns = [
    'id_no', 'serial_no', 'make', 'model', 'processor', 'generation',
    'ram_gb', 'status', 'location', 'created_at', 'updated_at',
  ];
  const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';

  // If grouping, sort by group field first
  if (group_by !== 'none') {
    query = query.order(group_by, { ascending: true });
  }
  query = query.order(sortColumn, { ascending: sort_dir });

  // Pagination
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Laptops fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform data to include checked_by_name
  const transformed = data?.map((laptop) => ({
    ...laptop,
    checked_by_name: laptop.checked_by_user?.name || null,
    checked_by_user: undefined,
  }));

  return NextResponse.json({
    data: transformed || [],
    total: count || 0,
    page,
    per_page,
    total_pages: Math.ceil((count || 0) / per_page),
  });
}

// POST /api/laptops - Create a new laptop
export async function POST(request: NextRequest) {
  const { session, error: authError } = await requireRole('editor');
  if (authError) return authError;

  const body = await request.json();
  const {
    id_no, serial_no, mis, make, model, processor, generation,
    ram_gb, storage1_type, storage1_size_gb, storage2_type, storage2_size_gb,
    screen, graphic_card, status, location, checked_by, remark,
  } = body;

  if (!id_no || !make || !model) {
    return NextResponse.json({ error: 'ID No, Make, and Model are required' }, { status: 400 });
  }

  // Check for duplicate id_no
  const { data: existing } = await supabase
    .from('laptops')
    .select('id')
    .eq('id_no', id_no)
    .eq('is_deleted', false)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'A laptop with this ID No already exists' }, { status: 409 });
  }

  // Check for duplicate serial_no (warning only, we still insert)
  let serialWarning = '';
  if (serial_no) {
    const { data: existingSerial } = await supabase
      .from('laptops')
      .select('id_no')
      .eq('serial_no', serial_no)
      .eq('is_deleted', false);

    if (existingSerial && existingSerial.length > 0) {
      serialWarning = `Warning: Serial No "${serial_no}" already exists on laptop(s): ${existingSerial.map((l) => l.id_no).join(', ')}`;
    }
  }

  const laptopId = uuidv4();
  const batchId = uuidv4();

  const { data, error } = await supabase
    .from('laptops')
    .insert({
      id: laptopId,
      id_no, serial_no: serial_no || null, mis: mis || null,
      make, model,
      processor: processor || null,
      generation: generation ? parseInt(generation) : null,
      ram_gb: ram_gb ? parseInt(ram_gb) : null,
      storage1_type: storage1_type || null,
      storage1_size_gb: storage1_size_gb ? parseInt(storage1_size_gb) : null,
      storage2_type: storage2_type || null,
      storage2_size_gb: storage2_size_gb ? parseInt(storage2_size_gb) : null,
      screen: screen || null,
      graphic_card: graphic_card || null,
      status: status || 'Board',
      location: location || 'In Stock',
      checked_by: checked_by || null,
      remark: remark || null,
      created_by: session!.user.id,
      updated_by: session!.user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A laptop with this ID No already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log creation in audit
  await supabase.from('audit_log').insert({
    laptop_id: laptopId,
    laptop_id_no: id_no,
    action: 'create',
    snapshot: data,
    performed_by: session!.user.id,
    batch_id: batchId,
  });

  // Auto-add make/model to dropdown_options if new
  await autoAddDropdown('make', make);
  await autoAddDropdown('model', model, make);

  return NextResponse.json({ data, warning: serialWarning || undefined }, { status: 201 });
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
