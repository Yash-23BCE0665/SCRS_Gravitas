import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AdminUser } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Missing username or password.' }, { status: 400 });
    }


    // Query the admin directly from Supabase
    const { data: admin, error } = await supabase
      .from('admin')
      .select('id, username, password')
      .eq('username', username)
      .single();

    // Debug logging
    console.log('ADMIN LOGIN DEBUG:', { username, password, admin, error });

    if (error || !admin || admin.password !== password) {
      return NextResponse.json({
        message: 'Invalid credentials.',
        debug: { username, password, admin, error }
      }, { status: 401 });
    }

    // In a real app, you would issue a secure token (e.g., JWT) here.
    // For this prototype, we'll just confirm success. The client will store a session flag.
    const adminSessionData: Pick<AdminUser, 'id' | 'username'> = { id: admin.id, username: admin.username };

    return NextResponse.json({ message: 'Admin login successful.', admin: adminSessionData }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
