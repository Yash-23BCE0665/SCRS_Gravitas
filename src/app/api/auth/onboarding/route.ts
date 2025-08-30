import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json();
    if (!email || !name || !password) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }
    // Update or insert user
    const { data: user, error } = await supabase
      .from('users')
      .upsert({ email: email.toLowerCase(), name, password }, { onConflict: 'email' })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ message: 'Failed to save user.' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Profile updated.', user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
