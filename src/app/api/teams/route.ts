import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Team, User, EventKey } from '@/lib/types';

// GET all teams or a specific team by ID
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const team = db.teams.find(t => t.id === id);
    if (team) {
      return NextResponse.json(team);
    }
    return NextResponse.json({ message: `Team with ID ${id} not found.` }, { status: 404 });
  }

  return NextResponse.json(db.teams);
}

// POST to create a new team
export async function POST(request: NextRequest) {
  try {
    const { userName, teamName, regNo, event } = await request.json() as { userName: string, teamName: string, regNo: string, event: EventKey };

    if (!userName || !teamName || !regNo || !event) {
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

    const newUser: User = { id: regNo, name: userName };
    const newTeam: Team = {
        id: `T-${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
        name: teamName,
        members: [newUser],
        score: 0
    };

    db.teams.push(newTeam);

    return NextResponse.json({ message: `Team '${teamName}' created successfully!`, team: newTeam, user: newUser }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
