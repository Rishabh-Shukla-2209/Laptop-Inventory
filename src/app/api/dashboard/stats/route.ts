import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';

// GET /api/dashboard/stats
export async function GET(_request: NextRequest) {
  const { error: authError } = await requireRole('viewer');
  if (authError) return authError;

  try {
    // Total active laptops
    const { count: total } = await supabase
      .from('laptops')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    // By status
    const { data: statusData } = await supabase
      .from('laptops')
      .select('status')
      .eq('is_deleted', false);

    const by_status: Record<string, number> = {};
    statusData?.forEach((row) => {
      by_status[row.status] = (by_status[row.status] || 0) + 1;
    });

    // By location
    const { data: locationData } = await supabase
      .from('laptops')
      .select('location')
      .eq('is_deleted', false);

    const by_location: Record<string, number> = {};
    locationData?.forEach((row) => {
      by_location[row.location] = (by_location[row.location] || 0) + 1;
    });

    // By make
    const { data: makeData } = await supabase
      .from('laptops')
      .select('make')
      .eq('is_deleted', false);

    const by_make: Record<string, number> = {};
    makeData?.forEach((row) => {
      by_make[row.make] = (by_make[row.make] || 0) + 1;
    });

    // By generation
    const { data: genData } = await supabase
      .from('laptops')
      .select('generation')
      .eq('is_deleted', false)
      .not('generation', 'is', null);

    const by_generation: Record<string, number> = {};
    genData?.forEach((row) => {
      const gen = String(row.generation);
      by_generation[gen] = (by_generation[gen] || 0) + 1;
    });

    return NextResponse.json({
      total: total || 0,
      by_status,
      by_location,
      by_make,
      by_generation,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
