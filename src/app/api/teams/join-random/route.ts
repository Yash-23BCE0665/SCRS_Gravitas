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

    // Check for existing pending requests
    const { data: existingRequests } = await supabase
      .from('join_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (existingRequests && existingRequests.length > 0) {
      return NextResponse.json({ 
        message: 'You already have pending join requests. Please wait for team leaders to respond.' 
      }, { status: 409 });
    }

    // Find teams with available slots
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, leader_id, members, event')
      .eq('event', effectiveEvent);

    if (teamsError) {
      return NextResponse.json({ message: 'Error fetching teams.' }, { status: 500 });
    }

    // Filter teams that have space
    const availableTeams = (teams || []).filter(team => 
      team.members && team.members.length < MAX_TEAM_MEMBERS
    );

    if (availableTeams.length === 0) {
      // If no teams with space, create a new team
      const teamName = `Team ${Date.now()}`;
      const { data: newTeam, error: createError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          leader_id: userId,
          members: [{ id: userId, name: userName, email: userEmail }],
          score: 0,
          event: effectiveEvent
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ message: 'Error creating new team.' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'New team created as no teams were available for joining.',
        team: newTeam
      });
    }

    // Send join requests to all available teams
    const joinRequests = availableTeams.map(team => ({
      team_id: team.id,
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      status: 'pending'
    }));

    const { error: requestError } = await supabase
      .from('join_requests')
      .insert(joinRequests);

    if (requestError) {
      return NextResponse.json({ message: 'Error sending join requests.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Join requests sent to ${availableTeams.length} teams. Please wait for a team leader to accept.`,
      requestCount: availableTeams.length
    });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
