import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';

// POST to leave a team
export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await request.json() as { userId: string, teamId: string };

    if (!userId || !teamId) {
      return NextResponse.json({ message: 'Missing userId or teamId.' }, { status: 400 });
    }

    const teamIndex = db.teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) {
      return NextResponse.json({ message: 'Team not found.' }, { status: 404 });
    }

    const team = db.teams[teamIndex];
    const memberIndex = team.members.findIndex(m => m.id === userId);

    if (memberIndex === -1) {
      return NextResponse.json({ message: 'You are not a member of this team.' }, { status: 403 });
    }

    // If the user is the leader
    if (team.leaderId === userId) {
      // If there are other members, they cannot leave. Must transfer leadership first (not implemented).
      // For now, we allow leaving only if they are the last member.
      if (team.members.length > 1) {
        // A more robust implementation would allow transferring leadership.
        // For this prototype, the leader can only leave if they are the sole member,
        // in which case the team is disbanded.
        return NextResponse.json({ message: 'Leader cannot leave a team with other members. Please transfer leadership first.' }, { status: 400 });
      }
      // If leader is the last one, disband the team
      db.teams.splice(teamIndex, 1);
      return NextResponse.json({ message: 'You have left the team, and the team has been disbanded.' }, { status: 200 });

    }

    // If the user is a regular member
    team.members.splice(memberIndex, 1);

    return NextResponse.json({ message: 'You have successfully left the team.' }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
