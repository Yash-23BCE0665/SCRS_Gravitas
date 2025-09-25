import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Try to fetch all tables
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('admin')
      .select('*');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Admin table exists', count: data?.length || 0 });
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
}