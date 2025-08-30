import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const teamId = params.id;
  const { memberId } = await request.json();
  if (!teamId || !memberId) {
    return NextResponse.json({ message: 'Missing teamId or memberId.' }, { status: 400 });
  }
  // Fetch team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  if (teamError || !team) {
    return NextResponse.json({ message: 'Team not found.' }, { status: 404 });
  }
  // Remove member
  const updatedMembers = (team.members || []).filter((m: any) => m.id !== memberId);
  // If leader is removed, assign new leader if possible
  let newLeaderId = team.leader_id;
  if (team.leader_id === memberId && updatedMembers.length > 0) {
    newLeaderId = updatedMembers[0].id;
  }
  // If no members left, delete team
  if (updatedMembers.length === 0) {
    await supabase.from('teams').delete().eq('id', teamId);
    return NextResponse.json({ message: 'Team disbanded (no members left).' });
  }
  // Update team
  const { error: updateError } = await supabase
    .from('teams')
    .update({ members: updatedMembers, leader_id: newLeaderId })
    .eq('id', teamId);
  if (updateError) {
    return NextResponse.json({ message: 'Error updating team.' }, { status: 500 });
  }
  return NextResponse.json({ message: 'Member removed successfully.' });
}
