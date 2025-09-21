import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MAX_TEAM_MEMBERS } from '@/lib/db';
import type { Team, User, EventKey } from '@/lib/types';
import { DEFAULT_EVENT } from '@/lib/types';

const MYSTERY_TEAM_NAMES = [
    "The Enigma Squad", "Cipher Syndicate", "Vortex Voyagers", "Phantom Phalanx", "Eclipse Raiders"
];

// POST to enqueue user for random team assignment (admin will create teams)
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, event } = await request.json();

    if (!userId || !userEmail || !userName) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const effectiveEvent = event || DEFAULT_EVENT;

    // Verify event registration
    const { data: eventRegistration } = await supabase
      .from('event_registration')
      .select('*')
      .eq('event_key', effectiveEvent)
      .eq('user_email', userEmail);

    if (!eventRegistration?.length) {
      return NextResponse.json({ message: `Email ${userEmail} not registered for this event.` }, { status: 403 });
    }

    // Check if user is already in any team
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('*')
      .contains('members', [{ id: userId }]);

    if (existingTeams && existingTeams.length > 0) {
      return NextResponse.json({ message: `User is already in a team.` }, { status: 409 });
    }

    // Check if user already in random pool
    const { data: existingPool } = await supabase
      .from('random_pool')
      .select('id')
      .eq('user_id', userId)
      .eq('event', effectiveEvent)
      .maybeSingle();
    if (existingPool) {
      return NextResponse.json({ message: 'You are already in the random selection queue.' }, { status: 200 });
    }

    // Enqueue user in random_pool
    const { error: enqueueError } = await supabase
      .from('random_pool')
      .insert({
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        event: effectiveEvent,
      });
    if (enqueueError) {
      return NextResponse.json({ message: 'Error adding to random queue.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'You have been added to the random team queue. The admins will assign teams shortly.'
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
