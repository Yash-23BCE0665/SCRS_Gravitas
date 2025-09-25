import { NextResponse, type NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, name, username, password } = await request.json();
    if (!email || !name || !username || !password) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;
    const normalizedEmail = String(email).trim().toLowerCase();

    // Ensure username is unique (CITEXT -> case-insensitive)
    const { data: existingByUsername } = await client
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (existingByUsername) {
      return NextResponse.json({ message: 'Username already taken. Choose another.' }, { status: 409 });
    }

    // Upsert by email; set name, username, and password
    const { data: user, error } = await client
      .from('users')
      .upsert({ email: normalizedEmail, name, username, password }, { onConflict: 'email' })
      .select()
      .single();
    if (error) {
      const msg = (error as any)?.code === '23505' ? 'Username or email already exists.' : 'Failed to save user.';
      return NextResponse.json({ message: msg }, { status: 500 });
    }
    // Auto-enqueue in random pool if user not in any team
    const { data: existingTeams } = await client
      .from('teams')
      .select('id')
      .contains('members', [{ email: normalizedEmail }]);

    if (!existingTeams || existingTeams.length === 0) {
      const { data: reg } = await client
        .from('event_registration')
        .select('*')
        .ilike('user_email', normalizedEmail)
        .eq('event_key', 'escape-exe-ii')
        .maybeSingle();
      if (reg?.event_date) {
        await client
          .from('random_pool')
          .upsert({
            user_id: user.id,
            user_name: user.name,
            user_email: user.email,
            event: 'escape-exe-ii',
            event_date: reg.event_date,
          }, { onConflict: 'user_id,event' as any });
      }
    }

    return NextResponse.json({ message: 'Profile completed. Welcome!', user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
