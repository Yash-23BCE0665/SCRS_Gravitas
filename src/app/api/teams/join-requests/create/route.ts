import { NextResponse, type NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// POST: Create a join request for a team
export async function POST(request: NextRequest) {
  try {
    const { teamId, userId, userName, userEmail } = await request.json();
    if (!teamId || !userId || !userName || !userEmail) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }
    const client = supabaseAdmin || supabase;
    
    // Check if user is already in ANY team (not just this one)
    const { data: existingTeams } = await client
      .from('teams')
      .select('*')
      .contains('members', [{ id: userId }]);

    if (existingTeams && existingTeams.length > 0) {
      return NextResponse.json({ message: `User is already in a team.` }, { status: 409 });
    }

    // Check if the specific team exists
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('members')
      .eq('id', teamId)
      .single();
    if (teamError || !team) {
      return NextResponse.json({ message: 'Team not found.' }, { status: 404 });
    }
    // Check if a pending request already exists
    const { data: existing, error: existingError } = await client
      .from('join_requests')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();
    if (existingError) {
      return NextResponse.json({ message: 'Error checking existing requests.' }, { status: 500 });
    }
    if (existing) {
      return NextResponse.json({ message: 'Join request already pending.' }, { status: 409 });
    }
    // Create join request
    const { error: insertError } = await client
      .from('join_requests')
      .insert({
        team_id: teamId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        status: 'pending',
      });
    if (insertError) {
      return NextResponse.json({ message: 'Error creating join request.' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Join request created.' });
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
