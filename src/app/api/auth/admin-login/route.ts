import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { AdminUser } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Missing username or password.' }, { status: 400 });
    }

    const admin = db.admins.find(a => a.username === username);

    if (!admin || admin.password !== password) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // In a real app, you would issue a secure token (e.g., JWT) here.
    // For this prototype, we'll just confirm success. The client will store a session flag.
    const adminSessionData: Pick<AdminUser, 'id' | 'username'> = { id: admin.id, username: admin.username };

    return NextResponse.json({ message: 'Admin login successful.', admin: adminSessionData }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
