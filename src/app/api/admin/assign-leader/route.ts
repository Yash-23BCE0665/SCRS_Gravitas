import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// POST /api/admin/assign-leader
// Body: { teamId: string, newLeaderId: string }
// Assigns a new leader to a team (must be an existing member)
export async function POST(request: NextRequest) {
  try {
    const { teamId, newLeaderId } = await request.json();
    
    if (!teamId || !newLeaderId) {
      return NextResponse.json({ 
        message: 'Missing teamId or newLeaderId.' 
      }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    // Fetch the team
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ 
        message: 'Team not found.' 
      }, { status: 404 });
    }

    const members = team.members || [];
    
    // Check if new leader is a member of the team
    const newLeader = members.find((member: any) => member.id === newLeaderId);
    if (!newLeader) {
      return NextResponse.json({ 
        message: 'New leader must be an existing member of the team.' 
      }, { status: 400 });
    }

    // Check if the new leader is already the current leader
    if (team.leader_id === newLeaderId) {
      return NextResponse.json({ 
        message: 'This member is already the team leader.' 
      }, { status: 400 });
    }

    // Get current leader info for response
    const currentLeader = members.find((member: any) => member.id === team.leader_id);

    // Update team with new leader
    const { error: updateError } = await client
      .from('teams')
      .update({ leader_id: newLeaderId })
      .eq('id', teamId);

    if (updateError) {
      return NextResponse.json({ 
        message: 'Failed to update team leader.' 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Team leader assigned successfully.',
      teamId: teamId,
      teamName: team.name,
      previousLeader: currentLeader ? {
        id: currentLeader.id,
        name: currentLeader.name,
        email: currentLeader.email
      } : null,
      newLeader: {
        id: newLeader.id,
        name: newLeader.name,
        email: newLeader.email
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      message: 'An internal server error occurred.' 
    }, { status: 500 });
  }
}

// GET /api/admin/assign-leader?teamId=uuid
// Get team members for leader assignment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ 
        message: 'Missing teamId parameter.' 
      }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    // Fetch the team with members
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ 
        message: 'Team not found.' 
      }, { status: 404 });
    }

    const members = team.members || [];
    const currentLeaderId = team.leader_id;

    // Return team info with members and current leader
    return NextResponse.json({
      teamId: team.id,
      teamName: team.name,
      event: team.event,
      eventDate: team.event_date,
      currentLeader: members.find((member: any) => member.id === currentLeaderId),
      members: members.map((member: any) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        isCurrentLeader: member.id === currentLeaderId
      }))
    });

  } catch (error) {
    return NextResponse.json({ 
      message: 'An internal server error occurred.' 
    }, { status: 500 });
  }
}
