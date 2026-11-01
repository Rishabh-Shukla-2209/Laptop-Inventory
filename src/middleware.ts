import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to login
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  const role = req.auth.user?.role;

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (
    (pathname.startsWith('/laptops/new') ||
      pathname.startsWith('/laptops/import') ||
      pathname.includes('/edit')) &&
    role === 'viewer'
  ) {
    return NextResponse.redirect(new URL('/laptops', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
