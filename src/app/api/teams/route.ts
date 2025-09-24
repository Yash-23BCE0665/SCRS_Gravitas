import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Team, User, EventKey } from '@/lib/types';
import { DEFAULT_EVENT } from '@/lib/types';

// GET all teams or a specific team by ID
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const eventDate = searchParams.get('event_date');

  if (id) {
    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !team) {
      return NextResponse.json({ message: `Team with ID ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json(team);
  }

  const query = supabase
    .from('teams')
    .select('*');

  if (eventDate) {
    query.eq('event_date', eventDate);
  }

  const { data: teams, error } = await query;

  if (error) {
    return NextResponse.json({ message: 'Error fetching teams.' }, { status: 500 });
  }

  return NextResponse.json(teams);
}

// POST to create a new team
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, teamName, event, slotTime } = await request.json();

    const effectiveEvent: EventKey = event || DEFAULT_EVENT;

    if (!userId || !userEmail || !userName || !teamName) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Validate slot time (half-hour alignment)
    if (!slotTime || (typeof slotTime !== 'string')) {
      return NextResponse.json({ message: 'Missing slotTime.' }, { status: 400 });
    }
    const minutePart = Number(slotTime.split(':')[1]);
    if (Number.isNaN(minutePart) || (minutePart !== 0 && minutePart !== 30)) {
      return NextResponse.json({ message: 'Slot must start at 00 or 30 minutes.' }, { status: 400 });
    }

    // Verify event registration
    const { data: eventRegistration } = await supabase
      .from('event_registration')
      .select('*')
      .eq('event_key', effectiveEvent)
      .eq('user_email', userEmail);

    if (!eventRegistration?.length) {
      return NextResponse.json({ message: `Email ${userEmail} not registered for this event.` }, { status: 403 });
    }

    // Extract leader's event_date
    const leaderEventDate = eventRegistration?.[0]?.event_date as string | undefined;
    if (!leaderEventDate) {
      return NextResponse.json({ message: 'No event date found for this user.' }, { status: 403 });
    }

    // Enforce slot capacity: max 2 teams per slot per day
    const { data: slotTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('event', effectiveEvent)
      .eq('event_date', leaderEventDate)
      .eq('slot_time', slotTime);
    if ((slotTeams?.length || 0) >= 2) {
      return NextResponse.json({ message: 'Selected slot is full. Choose another slot.' }, { status: 409 });
    }

    // Check if user is already in any team
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('*')
      .contains('members', [{ id: userId }]);

    if (existingTeams && existingTeams.length > 0) {
      return NextResponse.json({ message: `User is already in a team.` }, { status: 409 });
    }

    // Get user details
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Format the user data for storage
    const memberData = {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
    };

    const newTeam = {
      name: teamName,
      leader_id: userId,
      members: [memberData],
      score: 0,
      event: effectiveEvent,
      event_date: leaderEventDate,
      slot_time: slotTime,
    };

    const { data: team, error } = await supabase
      .from('teams')
      .insert(newTeam)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: 'Error creating team.' }, { status: 500 });
    }

    // Remove the user from random pool
    await supabase
      .from('random_pool')
      .delete()
      .eq('user_id', userId)
      .eq('event', effectiveEvent)
      .eq('event_date', leaderEventDate);

    // Also remove any pending join requests from this user
    await supabase
      .from('join_requests')
      .delete()
      .eq('user_id', userId);

    return NextResponse.json({ 
      message: `Team '${teamName}' created successfully!`, 
      team, 
      user: memberData
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
