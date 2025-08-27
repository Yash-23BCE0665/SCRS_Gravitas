import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User, EventKey } from '@/lib/types';

// POST to join an existing team
export async function POST(request: NextRequest) {
  try {
    const { userName, teamId, regNo, event } = await request.json() as { userName: string, teamId: string, regNo: string, event: EventKey };

    if (!userName || !teamId || !regNo || !event) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Verify event registration
    if (!db.eventRegistrations[event]?.has(regNo)) {
      return NextResponse.json({ message: `Registration number ${regNo} not verified for this event.` }, { status: 403 });
    }

    // Check if user is already in any team
    const userExists = db.teams.some(team => team.members.some(member => member.id === regNo));
    if (userExists) {
      return NextResponse.json({ message: `User with registration number ${regNo} is already in a team.` }, { status: 409 });
    }

    const team = db.teams.find(t => t.id === teamId);
    if (!team) {
      return NextResponse.json({ message: 'Team ID not found.' }, { status: 404 });
    }

    if (team.members.length >= db.MAX_TEAM_MEMBERS) {
      return NextResponse.json({ message: 'Team is already full.' }, { status: 409 });
    }
    
    const newUser: User = { id: regNo, name: userName };
    team.members.push(newUser);

    return NextResponse.json({ message: `Successfully joined team '${team.name}'!`, team, user: newUser }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
