import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Team } from '@/lib/types';

interface Context {
  params: { id: string };
}

// PATCH to update a team's attributes
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const teamId = context.params.id;
    const { score, name } = await request.json() as Partial<Pick<Team, 'score' | 'name'>>;

    const team = db.teams.find(t => t.id === teamId);
    if (!team) {
        return NextResponse.json({ message: 'Team not found.' }, { status: 404 });
    }

    const updatedFields: string[] = [];

    if (score !== undefined) {
      if (typeof score !== 'number') {
        return NextResponse.json({ message: 'Score must be a number.' }, { status: 400 });
      }
      team.score = score;
      updatedFields.push('score');
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json({ message: 'Team name must be at least 2 characters.' }, { status: 400 });
      }
      team.name = name.trim();
      updatedFields.push('name');
    }
    
    if (updatedFields.length === 0) {
      return NextResponse.json({ message: 'No fields to update.' }, { status: 400 });
    }

    return NextResponse.json({ message: `Team '${team.name}' updated successfully (${updatedFields.join(', ')}).` }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
