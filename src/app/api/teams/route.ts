import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Team, User, EventKey } from '@/lib/types';

// GET all teams or a specific team by ID
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

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

  const { data: teams, error } = await supabase
    .from('teams')
    .select('*');

  if (error) {
    return NextResponse.json({ message: 'Error fetching teams.' }, { status: 500 });
  }

  return NextResponse.json(teams);
}

// POST to create a new team
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, teamName, event } = await request.json();

    if (!userId || !userEmail || !userName || !teamName || !event) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Verify event registration
    const { data: eventRegistration } = await supabase
      .from('event_registration')
      .select('*')
      .eq('event_key', event)
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
      event: event,
    };

    const { data: team, error } = await supabase
      .from('teams')
      .insert(newTeam)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: 'Error creating team.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Team '${teamName}' created successfully!`, 
      team, 
      user: memberData
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
