import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, name, username, password } = await request.json();
    if (!email || !name || !username || !password) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Ensure username is unique (case-sensitive uniqueness here; adjust if you prefer case-insensitive)
    const { data: existingByUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (existingByUsername) {
      return NextResponse.json({ message: 'Username already taken. Choose another.' }, { status: 409 });
    }

    // Upsert by email; set name, username, and password
    const { data: user, error } = await supabase
      .from('users')
      .upsert({ email: email.toLowerCase(), name, username, password }, { onConflict: 'email' })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ message: 'Failed to save user.' }, { status: 500 });
    }
    // Auto-enqueue in random pool if user not in any team
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('id')
      .contains('members', [{ email: email.toLowerCase() }]);

    if (!existingTeams || existingTeams.length === 0) {
      const { data: reg } = await supabase
        .from('event_registration')
        .select('*')
        .eq('user_email', email.toLowerCase())
        .eq('event_key', 'escape-exe-ii')
        .maybeSingle();
      if (reg?.event_date) {
        await supabase
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
