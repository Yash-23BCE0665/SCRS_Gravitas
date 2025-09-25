import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123' // You should change this immediately after first login
};

export async function GET() {
  try {
    // Check if admin table exists and has any users
    const client = supabaseAdmin || supabase;
    const { data: adminCount, error: countError } = await client
      .from('admin')
      .select('*', { count: 'exact' });

    if (countError) {
      console.error('Error checking admin table:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // If no admins exist, create the default admin
    if (!adminCount || adminCount.length === 0) {
      const { data: newAdmin, error: createError } = await client
        .from('admin')
        .insert([DEFAULT_ADMIN])
        .select()
        .single();

      if (createError) {
        console.error('Error creating default admin:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Default admin created',
        credentials: {
          username: DEFAULT_ADMIN.username,
          password: DEFAULT_ADMIN.password
        }
      });
    }

    return NextResponse.json({ message: 'Admin users exist', count: adminCount.length });
  } catch (error) {
    console.error('Error in setup-admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}