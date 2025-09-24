import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export const config = {
  matcher: ['/admin/:path*']
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  console.log('Middleware checking path:', path);

  // Allow access to login page and auth endpoints
  if (path === '/admin/login' || path.startsWith('/api/auth/')) {
    console.log('Allowing access to:', path);
    return NextResponse.next();
  }

  const adminSession = request.cookies.get('admin-session');
  console.log('Admin session found:', !!adminSession);
  
  if (!adminSession?.value) {
    const url = new URL('/admin/login', request.url);
    return NextResponse.redirect(url);
  }

  try {
    // Verify the session data is valid JSON
    const session = JSON.parse(adminSession.value);
    if (!session.username) {
      const url = new URL('/admin/login', request.url);
      return NextResponse.redirect(url);
    }
  } catch {
    const url = new URL('/admin/login', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}