import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { regNo, password } = await request.json();

    if (!regNo || !password) {
      return NextResponse.json({ message: 'Missing registration number or password.' }, { status: 400 });
    }

    const user = db.users.find(u => u.id.toUpperCase() === regNo.toUpperCase());

    if (!user) {
        return NextResponse.json({ message: 'Registration number not found in our records.' }, { status: 404 });
    }

    // IMPORTANT: In a real-world application, NEVER store or compare plaintext passwords.
    // Always hash passwords before storing them and use a secure comparison function.
    if (user.password !== password) {
        return NextResponse.json({ message: 'Invalid password.' }, { status: 401 });
    }

    // Don't send the password back to the client.
    const userSessionData: User = { id: user.id, name: user.name };

    return NextResponse.json({ message: `Welcome back, ${user.name}!`, user: userSessionData }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
