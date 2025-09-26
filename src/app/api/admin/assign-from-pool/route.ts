import { NextResponse, type NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_EVENT } from '@/lib/types';
import { MAX_TEAM_MEMBERS } from '@/lib/db';

// POST /api/admin/assign-from-pool
// Body: { userId: string, teamId: string, event?: string }
// Assign a single user from the random pool to a specific team, enforcing constraints
export async function POST(request: NextRequest) {
  try {
    const { userId, teamId, event } = await request.json();
    const effectiveEvent = event || DEFAULT_EVENT;

    if (!userId || !teamId) {
      return NextResponse.json({ message: 'Missing userId or teamId.' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    // Fetch target team
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ message: 'Team not found.' }, { status: 404 });
    }

    // Cross-check event
    if (team.event !== effectiveEvent) {
      return NextResponse.json({ message: 'This team is registered for a different event.' }, { status: 400 });
    }

    // Verify event registration and get event_date for the user
    const { data: eventRegistration } = await client
      .from('event_registration')
      .select('*')
      .eq('event_key', effectiveEvent)
      .eq('user_id', userId);

    const userEventDate = eventRegistration?.[0]?.event_date as string | undefined;
    if (!userEventDate) {
      return NextResponse.json({ message: 'No event date found for this user.' }, { status: 403 });
    }

    if ((team as any).event_date && (team as any).event_date !== userEventDate) {
      return NextResponse.json({ message: 'User can only join a team scheduled for their date.' }, { status: 400 });
    }

    // Check if user is already in any team
    const { data: existingTeams } = await client
      .from('teams')
      .select('id')
      .contains('members', [{ id: userId }]);

    if (existingTeams && existingTeams.length > 0) {
      return NextResponse.json({ message: 'User is already in a team.' }, { status: 409 });
    }

    // Ensure team has capacity
    const currentMembers = team.members || [];
    if (currentMembers.length >= MAX_TEAM_MEMBERS) {
      return NextResponse.json({ message: 'Team is already full.' }, { status: 409 });
    }

    // Get user profile
    const { data: existingUser } = await client
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const memberData = {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
    };

    // Update team with new member
    const { data: updatedTeam, error: updateError } = await client
      .from('teams')
      .update({ members: [...currentMembers, memberData] })
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ message: 'Error updating team.' }, { status: 500 });
    }

    // Remove user from random pool (date-scoped) if present
    await client
      .from('random_pool')
      .delete()
      .eq('user_id', userId)
      .eq('event', effectiveEvent)
      .eq('event_date', (team as any).event_date);

    // Remove pending join requests for this user
    await client
      .from('join_requests')
      .delete()
      .eq('user_id', userId);

    return NextResponse.json({
      message: `User assigned to team '${team.name}'.`,
      team: updatedTeam,
      user: memberData,
    });
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}


