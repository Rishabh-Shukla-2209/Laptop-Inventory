import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';
import bcrypt from 'bcryptjs';

// GET /api/users - List all users
export async function GET(_request: NextRequest) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const body = await request.json();
  const { name, email, password, role } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from('users')
    .insert({ name, email, password_hash: passwordHash, role })
    .select('id, name, email, role, is_active, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
