import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { MAX_TEAM_MEMBERS } from '@/lib/db';

// POST /api/admin/merge-teams
// Body: { sourceTeamId: string, targetTeamId: string }
// Merges source team members into target team, enforcing same event and date, and capacity
export async function POST(request: NextRequest) {
  try {
    const { sourceTeamId, targetTeamId } = await request.json();
    if (!sourceTeamId || !targetTeamId) {
      return NextResponse.json({ message: 'Missing sourceTeamId or targetTeamId.' }, { status: 400 });
    }
    if (sourceTeamId === targetTeamId) {
      return NextResponse.json({ message: 'Source and target teams must be different.' }, { status: 400 });
    }

    // Fetch both teams
    const client = supabaseAdmin || supabase;
    const { data: sourceTeam, error: srcErr } = await client
      .from('teams')
      .select('*')
      .eq('id', sourceTeamId)
      .single();
    if (srcErr || !sourceTeam) {
      return NextResponse.json({ message: 'Source team not found.' }, { status: 404 });
    }

    const { data: targetTeam, error: tgtErr } = await client
      .from('teams')
      .select('*')
      .eq('id', targetTeamId)
      .single();
    if (tgtErr || !targetTeam) {
      return NextResponse.json({ message: 'Target team not found.' }, { status: 404 });
    }

    // Enforce same event and same event_date
    if (sourceTeam.event !== targetTeam.event) {
      return NextResponse.json({ message: 'Teams must be for the same event.' }, { status: 400 });
    }
    if ((sourceTeam as any).event_date !== (targetTeam as any).event_date) {
      return NextResponse.json({ message: 'Teams must have the same event date.' }, { status: 400 });
    }

    const sourceMembers = sourceTeam.members || [];
    const targetMembers = targetTeam.members || [];

    // Ensure no duplicate users
    const targetMemberIds = new Set<string>(targetMembers.map((m: any) => m.id));
    const uniqueSourceMembers = sourceMembers.filter((m: any) => !targetMemberIds.has(m.id));

    const mergedMembers = [...targetMembers, ...uniqueSourceMembers];
    if (mergedMembers.length > MAX_TEAM_MEMBERS) {
      return NextResponse.json({ message: `Merged team would exceed capacity of ${MAX_TEAM_MEMBERS}.` }, { status: 400 });
    }

    // Update target team members first
    const { error: updateErr } = await client
      .from('teams')
      .update({ members: mergedMembers })
      .eq('id', targetTeam.id);
    if (updateErr) {
      return NextResponse.json({ message: 'Failed to update target team.' }, { status: 500 });
    }

    // Delete source team after successful update
    const { error: deleteErr } = await client
      .from('teams')
      .delete()
      .eq('id', sourceTeam.id);
    if (deleteErr) {
      return NextResponse.json({ message: 'Failed to delete source team after merge.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Teams merged successfully.', 
      targetTeamId: targetTeam.id,
      mergedCount: uniqueSourceMembers.length 
    });
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}


