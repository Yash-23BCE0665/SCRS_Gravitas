import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password, google, name } = await request.json();

    if (google) {
      // Google OAuth flow
      if (!email) {
        return NextResponse.json({ message: 'Missing email from Google login.' }, { status: 400 });
      }
      // Check if email is registered for any event
      const { data: regData } = await supabase
        .from('event_registration')
        .select('*')
        .eq('user_email', email.toLowerCase());
      if (!regData || regData.length === 0) {
        return NextResponse.json({ message: 'You are not registered for any event.' }, { status: 403 });
      }
      // Upsert user in users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .upsert({ email: email.toLowerCase(), name }, { onConflict: 'email' })
        .select()
        .single();
      if (userError) {
        return NextResponse.json({ message: 'Error creating user.' }, { status: 500 });
      }
      return NextResponse.json({ message: `Welcome, ${user.name}!`, user }, { status: 200 });
    } else {
      // Fallback password login
      if (!email || !password) {
        return NextResponse.json({ message: 'Missing email or password.' }, { status: 400 });
      }
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, password')
        .eq('email', email.toLowerCase())
        .single();
      if (error || !user) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }
      if (!user.password || user.password !== password) {
        return NextResponse.json({ message: 'Invalid password.' }, { status: 401 });
      }
      return NextResponse.json({ message: `Welcome back, ${user.name}!`, user }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
