import { NextResponse, type NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const adminSession = request.cookies.get('admin-session');

    if (!adminSession?.value) {
      console.error('No admin session found');
      return NextResponse.json({ message: 'No session found' }, { status: 401 });
    }

    const session = JSON.parse(adminSession.value);
    console.log('Parsed session:', session);

    if (!session.username) {
      return NextResponse.json({ message: 'Invalid session format' }, { status: 401 });
    }

    // Verify that the admin exists
    const client = supabaseAdmin || supabase;
    const { data: admin, error } = await client
      .from('admin')
      .select('id, username')
      .eq('username', session.username)
      .single();

    if (error || !admin) {
      return NextResponse.json({ message: 'Invalid admin session' }, { status: 401 });
    }

    return NextResponse.json({ message: 'Valid admin session' });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}