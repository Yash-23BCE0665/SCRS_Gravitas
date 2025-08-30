import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MAX_TEAM_MEMBERS } from '@/lib/db';
import type { Team, User, EventKey } from '@/lib/types';

const MYSTERY_TEAM_NAMES = [
    "The Enigma Squad", "Cipher Syndicate", "Vortex Voyagers", "Phantom Phalanx", "Eclipse Raiders"
];

// POST to join a random team
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, event } = await request.json();

    if (!userId || !userEmail || !userName || !event) {
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

    // Get user details from the database
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Format the user data
    const memberData = {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
    };

    // Find a team for the specific event with space
    const { data: availableTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('event', event)
      .order('created_at', { ascending: true });

    // Find the first team that has space
    const availableTeam = availableTeams?.find(t => 
      (t.members as any[]).length < MAX_TEAM_MEMBERS
    );

    if (availableTeam) {
      // Instead of direct assignment, create a join request for this team
      // Check if a pending request already exists
      const { data: existing, error: existingError } = await supabase
        .from('join_requests')
        .select('id')
        .eq('team_id', availableTeam.id)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();
      if (existingError) {
        return NextResponse.json({ message: 'Error checking existing requests.' }, { status: 500 });
      }
      if (existing) {
        return NextResponse.json({ message: 'Join request already pending for this team.' }, { status: 409 });
      }
      // Create join request
      const { error: insertError } = await supabase
        .from('join_requests')
        .insert({
          team_id: availableTeam.id,
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          status: 'pending',
        });
      if (insertError) {
        return NextResponse.json({ message: 'Error creating join request.' }, { status: 500 });
      }
      return NextResponse.json({ 
        message: `A join request has been sent to team '${availableTeam.name}'. Awaiting leader approval.`,
        team: availableTeam,
        user: memberData
      }, { status: 200 });
    }

    // If no team is available, create a new team and assign the user as leader
    const { data: teamsCount } = await supabase
      .from('teams')
      .select('id', { count: 'exact' });

    const teamName = MYSTERY_TEAM_NAMES[(teamsCount?.length || 0) % MYSTERY_TEAM_NAMES.length];
    
    const newTeam = {
      name: teamName,
      leader_id: userId,
      members: [memberData],
      score: 0,
      event: event,
    };

    const { data: createdTeam, error: createError } = await supabase
      .from('teams')
      .insert(newTeam)
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ message: 'Error creating team.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `A new team '${teamName}' has been forged for you!`, 
      team: createdTeam, 
      user: memberData 
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
