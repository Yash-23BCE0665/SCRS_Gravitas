import { NextResponse, type NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET: Fetch join requests for a leader's team(s)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leaderId = searchParams.get('leaderId');
  if (!leaderId) {
    return NextResponse.json({ message: 'Missing leaderId.' }, { status: 400 });
  }
  // Find all teams where this user is leader
  const client = supabaseAdmin || supabase;
  const { data: teams, error: teamError } = await client
    .from('teams')
    .select('id')
    .eq('leader_id', leaderId);
  if (teamError || !teams) {
    return NextResponse.json({ message: 'Error fetching teams.' }, { status: 500 });
  }
  const teamIds = teams.map(t => t.id);
  if (!teamIds.length) {
    return NextResponse.json([]);
  }
  // Fetch join requests for these teams
  const { data: requests, error } = await client
    .from('join_requests')
    .select('*')
    .in('team_id', teamIds)
    .eq('status', 'pending');
  if (error) {
    return NextResponse.json({ message: 'Error fetching join requests.' }, { status: 500 });
  }
  return NextResponse.json(requests);
}

// POST: Accept or reject a join request
export async function POST(request: NextRequest) {
  try {
    const { requestId, action } = await request.json(); // action: 'accept' | 'reject'
    if (!requestId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Missing or invalid fields.' }, { status: 400 });
    }
    // Get the join request
    const client = supabaseAdmin || supabase;
    const { data: joinRequest, error: fetchError } = await client
      .from('join_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (fetchError || !joinRequest) {
      return NextResponse.json({ message: 'Join request not found.' }, { status: 404 });
    }
    if (joinRequest.status !== 'pending') {
      return NextResponse.json({ message: 'Request already handled.' }, { status: 400 });
    }
    if (action === 'reject') {
      await client
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      return NextResponse.json({ message: 'Request rejected.' });
    }
    // Check if user is already in ANY team before accepting
    const { data: existingTeams } = await client
      .from('teams')
      .select('*')
      .contains('members', [{ id: joinRequest.user_id }]);

    if (existingTeams && existingTeams.length > 0) {
      await client
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      return NextResponse.json({ message: 'User is already in a team.' }, { status: 409 });
    }

    // Accept: add user to team if not already present and not full
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('*')
      .eq('id', joinRequest.team_id)
      .single();
    if (teamError || !team) {
      return NextResponse.json({ message: 'Team not found.' }, { status: 404 });
    }
    if (team.members.length >= 4) {
      await client
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      return NextResponse.json({ message: 'Team is full.' }, { status: 409 });
    }
    // Add user to team
    const updatedMembers = [...team.members, {
      id: joinRequest.user_id,
      name: joinRequest.user_name,
      email: joinRequest.user_email,
    }];
    await client
      .from('teams')
      .update({ members: updatedMembers })
      .eq('id', team.id);
    // Mark accepted and remove all other pending requests for this user
    await client
      .from('join_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    await client
      .from('join_requests')
      .delete()
      .eq('user_id', joinRequest.user_id)
      .eq('status', 'pending');

    // Remove user from random pool if present
    await client
      .from('random_pool')
      .delete()
      .eq('user_id', joinRequest.user_id);

    return NextResponse.json({ message: 'User added to team.' });
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
