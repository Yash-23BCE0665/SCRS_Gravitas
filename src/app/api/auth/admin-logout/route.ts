import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  
  // Clear the admin session cookie
  response.cookies.delete('admin-session');
  
  return response;
}