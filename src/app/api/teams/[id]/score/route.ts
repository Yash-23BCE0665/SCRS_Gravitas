import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';

interface Context {
  params: { id: string };
}

// PATCH to update a team's score
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const teamId = context.params.id;
    const { score } = await request.json() as { score: number };

    if (score === undefined || typeof score !== 'number') {
        return NextResponse.json({ message: 'Score must be a number.' }, { status: 400 });
    }

    const team = db.teams.find(t => t.id === teamId);
    if (!team) {
        return NextResponse.json({ message: 'Team not found.' }, { status: 404 });
    }

    team.score = score;
    
    return NextResponse.json({ message: `Score for '${team.name}' updated to ${score}.` }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
