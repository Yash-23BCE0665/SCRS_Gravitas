import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MAX_TEAM_MEMBERS } from '@/lib/db';
import type { Team, User, EventKey } from '@/lib/types';
import { DEFAULT_EVENT } from '@/lib/types';

const MYSTERY_TEAM_NAMES = [
    "The Enigma Squad", "Cipher Syndicate", "Vortex Voyagers", "Phantom Phalanx", "Eclipse Raiders"
];

// POST to send join requests to teams with available slots
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, event } = await request.json();

    if (!userId || !userEmail || !userName) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const effectiveEvent = event || DEFAULT_EVENT;

    // Verify event registration and extract event_date
    const { data: eventRegistration } = await supabase
      .from('event_registration')
      .select('*')
      .eq('event_key', effectiveEvent)
      .eq('user_email', userEmail);

    if (!eventRegistration?.length) {
      return NextResponse.json({ message: `Email ${userEmail} not registered for this event.` }, { status: 403 });
    }

    const eventDate = eventRegistration?.[0]?.event_date as string | undefined;
    if (!eventDate) {
      return NextResponse.json({ message: 'No event date found for this user.' }, { status: 403 });
    }

    // Check if user is already in any team
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('*')
      .contains('members', [{ id: userId }]);

    if (existingTeams && existingTeams.length > 0) {
      return NextResponse.json({ message: `User is already in a team.` }, { status: 409 });
    }

    // Find teams with available slots on the same date
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, leader_id, members, event, event_date')
      .eq('event', effectiveEvent)
      .eq('event_date', eventDate);

    if (teamsError) {
      return NextResponse.json({ message: 'Error fetching teams.' }, { status: 500 });
    }

    // Filter teams that have space
    const availableTeams = (teams || []).filter(team => 
      team.members && team.members.length < MAX_TEAM_MEMBERS
    );

    if (availableTeams.length === 0) {
      return NextResponse.json({ 
        message: 'No teams are available to join for your event date right now. Please try again later.'
      }, { status: 404 });
    }

    // Enqueue in random_pool with event_date for admin batching
    const { data: existingPool } = await supabase
      .from('random_pool')
      .select('id')
      .eq('user_id', userId)
      .eq('event', effectiveEvent)
      .maybeSingle();
    if (!existingPool) {
      const { error: enqueueErr } = await supabase
        .from('random_pool')
        .insert({ user_id: userId, user_name: userName, user_email: userEmail, event: effectiveEvent, event_date: eventDate });
      if (enqueueErr) {
        return NextResponse.json({ message: 'Error adding to random queue.' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'You have been added to the random team queue for your date. Admins will assign teams shortly.'
    });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
