import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { User, EventKey } from '@/lib/types';
import { MAX_TEAM_MEMBERS } from '@/lib/db';
import { DEFAULT_EVENT } from '@/lib/types';

// POST to join an existing team
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, teamId, event } = await request.json();

    const effectiveEvent = event || DEFAULT_EVENT;

    if (!userId || !userEmail || !userName || !teamId) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Get team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ message: 'Team ID not found.' }, { status: 404 });
    }
    
    // Cross-check event
    if(team.event !== effectiveEvent) {
      return NextResponse.json({ message: `This team is registered for a different event.` }, { status: 400 });
    }

    // Verify event registration
    const { data: eventRegistration } = await supabase
      .from('event_registration')
      .select('*')
      .eq('event_key', effectiveEvent)
      .eq('user_email', userEmail);
    // Enforce same event_date as team
    const userEventDate = eventRegistration?.[0]?.event_date as string | undefined;
    if (!userEventDate) {
      return NextResponse.json({ message: 'No event date found for this user.' }, { status: 403 });
    }
    if ((team as any).event_date && (team as any).event_date !== userEventDate) {
      return NextResponse.json({ message: 'You can only join a team scheduled for your date.' }, { status: 400 });
    }


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

    // Get the current team members
    const currentMembers = team.members || [];
    if (currentMembers.length >= MAX_TEAM_MEMBERS) {
      return NextResponse.json({ message: 'Team is already full.' }, { status: 409 });
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

    // Prepare member data
    const memberData = {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
    };

    // Update team with new member
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update({ 
        members: [...currentMembers, memberData]
      })
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ message: 'Error updating team.' }, { status: 500 });
    }

    // Remove user from random pool if they were in it
    await supabase
      .from('random_pool')
      .delete()
      .eq('user_id', userId)
      .eq('event', effectiveEvent)
      .eq('event_date', (team as any).event_date);

    // Delete any pending join requests from this user
    await supabase
      .from('join_requests')
      .delete()
      .eq('user_id', userId);

    return NextResponse.json({ 
      message: `Successfully joined team '${team.name}'!`, 
      team: updatedTeam, 
      user: memberData 
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
