import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth-helpers';
import Papa from 'papaparse';

// GET /api/laptops/export - Export laptops to CSV
export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('viewer');
  if (authError) return authError;

  const params = request.nextUrl.searchParams;
  const make = params.get('make') || '';
  const model = params.get('model') || '';
  const status = params.get('status') || '';
  const location = params.get('location') || '';

  let query = supabase
    .from('laptops')
    .select('*, checked_by_user:users!laptops_checked_by_fkey(name)')
    .eq('is_deleted', false)
    .order('id_no', { ascending: true });

  if (make) query = query.eq('make', make);
  if (model) query = query.eq('model', model);
  if (status) query = query.eq('status', status);
  if (location) query = query.eq('location', location);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const exportData = data?.map((laptop) => ({
    'ID No': laptop.id_no,
    'Serial No': laptop.serial_no || '',
    'MIS': laptop.mis || '',
    'Make': laptop.make,
    'Model': laptop.model,
    'Processor': laptop.processor || '',
    'Generation': laptop.generation ?? '',
    'RAM (GB)': laptop.ram_gb ?? '',
    'Storage 1 Type': laptop.storage1_type || '',
    'Storage 1 Size (GB)': laptop.storage1_size_gb ?? '',
    'Storage 2 Type': laptop.storage2_type || '',
    'Storage 2 Size (GB)': laptop.storage2_size_gb ?? '',
    'Screen': laptop.screen || '',
    'Graphic Card': laptop.graphic_card || '',
    'Status': laptop.status,
    'Location': laptop.location,
    'Checked By': laptop.checked_by_user?.name || '',
    'Remark': laptop.remark || '',
  }));

  const csv = Papa.unparse(exportData || []);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="laptops_export_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
