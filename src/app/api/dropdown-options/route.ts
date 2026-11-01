import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';

// GET /api/dropdown-options
export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('viewer');
  if (authError) return authError;

  const category = request.nextUrl.searchParams.get('category');

  let query = supabase
    .from('dropdown_options')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/dropdown-options
export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const body = await request.json();
  const { category, value, parent_value, sort_order } = body;

  if (!category || !value) {
    return NextResponse.json({ error: 'Category and value are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('dropdown_options')
    .insert({ category, value, parent_value: parent_value || null, sort_order: sort_order || 0 })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This option already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PUT /api/dropdown-options
export async function PUT(request: NextRequest) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const body = await request.json();
  const { id, value, sort_order, is_active } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (value !== undefined) updates.value = value;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('dropdown_options')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/dropdown-options
export async function DELETE(request: NextRequest) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Soft delete: set is_active to false
  const { error } = await supabase
    .from('dropdown_options')
    .update({ is_active: false })
    .eq('id', parseInt(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
