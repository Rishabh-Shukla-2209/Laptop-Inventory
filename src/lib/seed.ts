import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

/**
 * Seeds the database with a default admin user if no admin exists.
 * Called on app initialization.
 */
export async function seedAdminUser() {
  try {
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (existingAdmin) {
      return; // Admin already exists
    }

    const passwordHash = await bcrypt.hash('admin123', 12);

    const { error } = await supabase.from('users').insert({
      name: 'Administrator',
      email: 'admin@laptopinventory.com',
      password_hash: passwordHash,
      role: 'admin',
      is_active: true,
    });

    if (error) {
      console.error('Failed to seed admin user:', error);
    } else {
      console.log('Default admin user created: admin@laptopinventory.com / admin123');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  }
}
