import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: Create a join request for a team
export async function POST(request: NextRequest) {
  try {
    const { teamId, userId, userName, userEmail } = await request.json();
    if (!teamId || !userId || !userName || !userEmail) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }
    // Check if user is already in the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('members')
      .eq('id', teamId)
      .single();
    if (teamError || !team) {
      return NextResponse.json({ message: 'Team not found.' }, { status: 404 });
    }
    if (team.members.some((m: any) => m.id === userId)) {
      return NextResponse.json({ message: 'User already in team.' }, { status: 409 });
    }
    // Check if a pending request already exists
    const { data: existing, error: existingError } = await supabase
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
    const { error: insertError } = await supabase
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
