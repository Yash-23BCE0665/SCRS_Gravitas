import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Team, User, EventKey } from '@/lib/types';

const MYSTERY_TEAM_NAMES = [
    "The Enigma Squad", "Cipher Syndicate", "Vortex Voyagers", "Phantom Phalanx", "Eclipse Raiders"
];

// POST to join a random team
export async function POST(request: NextRequest) {
  try {
    const { userName, regNo, event } = await request.json() as { userName: string, regNo: string, event: EventKey };

    if (!userName || !regNo || !event) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Verify event registration
    const registeredEvents = Object.keys(db.eventRegistrations).filter(key => 
        db.eventRegistrations[key as EventKey].has(regNo)
    );
    if (!registeredEvents.includes(event)) {
      return NextResponse.json({ message: `Registration number ${regNo} not verified for this event.` }, { status: 403 });
    }

    // Check if user is already in any team
    const userExists = db.teams.some(team => team.members.some(member => member.id === regNo));
    if (userExists) {
      return NextResponse.json({ message: `User with registration number ${regNo} is already in a team.` }, { status: 409 });
    }

    const newUser: User = { id: regNo, name: userName };

    // Find a team for the specific event with space
    let availableTeam = db.teams.find(t => t.event === event && t.members.length < db.MAX_TEAM_MEMBERS);

    if (availableTeam) {
        availableTeam.members.push(newUser);
        return NextResponse.json({ message: `You've been assigned to team '${availableTeam.name}'!`, team: availableTeam, user: newUser }, { status: 200 });
    }

    // Or create a new team if no space is available for that event
    const teamName = MYSTERY_TEAM_NAMES[db.teams.length % MYSTERY_TEAM_NAMES.length];
    const newTeam: Team = {
        id: `T-${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
        name: teamName,
        leaderId: newUser.id,
        members: [newUser],
        score: 0,
        event: event,
    };
    db.teams.push(newTeam);

    return NextResponse.json({ message: `A new team '${teamName}' has been forged for you!`, team: newTeam, user: newUser }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
