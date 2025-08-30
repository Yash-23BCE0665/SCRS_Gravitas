import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch join requests for a leader's team(s)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leaderId = searchParams.get('leaderId');
  if (!leaderId) {
    return NextResponse.json({ message: 'Missing leaderId.' }, { status: 400 });
  }
  // Find all teams where this user is leader
  const { data: teams, error: teamError } = await supabase
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
  const { data: requests, error } = await supabase
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
    const { data: joinRequest, error: fetchError } = await supabase
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
      await supabase
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      return NextResponse.json({ message: 'Request rejected.' });
    }
    // Accept: add user to team if not already present and not full
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', joinRequest.team_id)
      .single();
    if (teamError || !team) {
      return NextResponse.json({ message: 'Team not found.' }, { status: 404 });
    }
    if (team.members.some((m: any) => m.id === joinRequest.user_id)) {
      await supabase
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      return NextResponse.json({ message: 'User already in team.' }, { status: 409 });
    }
    if (team.members.length >= 4) {
      await supabase
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
    await supabase
      .from('teams')
      .update({ members: updatedMembers })
      .eq('id', team.id);
    await supabase
      .from('join_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    return NextResponse.json({ message: 'User added to team.' });
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
