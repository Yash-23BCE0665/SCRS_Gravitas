import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { identifier, email, password, google, name } = await request.json();

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

      // Add user to random pool if not already in a team
      const { data: userTeams } = await supabase
        .from('teams')
        .select('id')
        .contains('members', [{ id: user.id }]);

      if (!userTeams || userTeams.length === 0) {
        // Add to random pool if not already there
        const { data: existingPool } = await supabase
          .from('random_pool')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingPool) {
          const { error: poolError } = await supabase
            .from('random_pool')
            .insert({
              user_id: user.id,
              user_name: user.name,
              user_email: user.email.toLowerCase(),
              event: regData[0].event_key // Use the event from registration
            });
          
          if (poolError) {
            console.error('Error adding user to random pool:', poolError);
          }
        }
      }

      // Auto-enqueue user into random pool if not in any team
      const { data: existingTeams } = await supabase
        .from('teams')
        .select('id')
        .contains('members', [{ email: email.toLowerCase() }]);
      if (!existingTeams || existingTeams.length === 0) {
        const { data: reg } = await supabase
          .from('event_registration')
          .select('*')
          .eq('user_email', email.toLowerCase())
          .maybeSingle();
        if (reg?.event_date && reg?.event_key === 'escape-exe-ii') {
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
      return NextResponse.json({ message: `Welcome, ${user.name}!`, user }, { status: 200 });
    } else {
      // Identifier-based password login (username/email/reg number)
      if (!identifier || !password) {
        return NextResponse.json({ message: 'Missing identifier or password.' }, { status: 400 });
      }

      let foundUser: User | null = null;

      // Identifier is an email
      if (typeof identifier === 'string' && identifier.includes('@')) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, username, password')
          .eq('email', identifier.toLowerCase())
          .single();
        if (!error && data) foundUser = data as unknown as User;
      }

      // Try by username if not found and identifier has no '@'
      if (!foundUser && typeof identifier === 'string' && !identifier.includes('@')) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, username, password')
          .eq('username', identifier)
          .maybeSingle();
        if (!error && data) foundUser = data as unknown as User;
      }

      // Try by registration number (via event_registration -> email)
      if (!foundUser && typeof identifier === 'string' && !identifier.includes('@')) {
        const { data: reg } = await supabase
          .from('event_registration')
          .select('user_email')
          .eq('reg_no', identifier)
          .maybeSingle();
        if (reg?.user_email) {
          const { data } = await supabase
            .from('users')
            .select('id, name, email, username, password')
            .eq('email', reg.user_email.toLowerCase())
            .maybeSingle();
          if (data) foundUser = data as unknown as User;
        }
      }

      if (!foundUser) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }

      if (!foundUser.password || foundUser.password !== password) {
        return NextResponse.json({ message: 'Invalid password.' }, { status: 401 });
      }

      // Auto-enqueue on basic login if user is teamless
      const { data: existingTeams2 } = await supabase
        .from('teams')
        .select('id')
        .contains('members', [{ email: foundUser.email.toLowerCase() }]);
      if (!existingTeams2 || existingTeams2.length === 0) {
        const { data: reg2 } = await supabase
          .from('event_registration')
          .select('*')
          .eq('user_email', foundUser.email.toLowerCase())
          .maybeSingle();
        if (reg2?.event_date && reg2?.event_key === 'escape-exe-ii') {
          await supabase
            .from('random_pool')
            .upsert({
              user_id: foundUser.id,
              user_name: foundUser.name,
              user_email: foundUser.email,
              event: 'escape-exe-ii',
              event_date: reg2.event_date,
            }, { onConflict: 'user_id,event' as any });
        }
      }
      return NextResponse.json({ message: `Welcome back, ${foundUser.name}!`, user: foundUser }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
