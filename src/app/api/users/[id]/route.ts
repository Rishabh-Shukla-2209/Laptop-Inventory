import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';
import bcrypt from 'bcryptjs';

// PUT /api/users/[id] - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const { name, email, role, is_active } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('id, name, email, role, is_active, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/users/[id] - Deactivate a user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const { id } = await params;

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// POST /api/users/[id] - Reset password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const { password } = body;

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
