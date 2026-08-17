import { NextRequest, NextResponse } from 'next/server';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'X-DNS-Prefetch-Control': 'off',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    !request.cookies.get('gp_admin')?.value
  ) {
    const loginUrl = new URL('/admin/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json).*)',
  ],
};
