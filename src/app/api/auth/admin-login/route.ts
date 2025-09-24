import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AdminUser } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    console.log('Admin login attempt:', { username });

    if (!username || !password) {
      console.log('Missing credentials');
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

    const adminSessionData: Pick<AdminUser, 'id' | 'username'> = { id: admin.id, username: admin.username };
    
    // Create session data
    const sessionData = {
      username: admin.username,
      id: admin.id,
      timestamp: Date.now()
    };

    // Create the response
    const response = NextResponse.json(
      { 
        message: 'Admin login successful.',
        admin: { username: admin.username }
      },
      { status: 200 }
    );

    // Set session cookie
    response.cookies.set({
      name: 'admin-session',
      value: JSON.stringify(sessionData),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
