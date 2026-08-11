import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Basic in-memory rate limiting map.
// Note: In serverless environments, this state resets per cold start and per edge node, 
// but it is still highly effective for basic DoS/spam mitigation.
const rateLimitMap = new Map<string, { count: number; startTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50;

export function proxy(request: NextRequest) {
  // Only apply to /api routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || request.headers.get('referer') || '';
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    // 1. Strict Origin Validation
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.');
    const host = request.headers.get('host') || '';
    
    // We allow if origin matches the host exactly, or if it's local dev, or if no origin provided for basic GETs (but block for POST).
    const isSameOrigin = origin.includes(host);
    const isPostOrMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);

    if (isPostOrMutation && !isLocalhost && !isSameOrigin) {
      return new NextResponse(
        JSON.stringify({ error: 'Origin validation failed. Direct API access denied.' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    // 2. Rate Limiting
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    
    // Clean up old entries occasionally (simple garbage collection on access)
    if (Math.random() < 0.05) {
      for (const [key, data] of rateLimitMap.entries()) {
        if (data.startTime < windowStart) {
          rateLimitMap.delete(key);
        }
      }
    }

    const currentRecord = rateLimitMap.get(ip) || { count: 0, startTime: now };

    if (currentRecord.startTime < windowStart) {
      currentRecord.count = 1;
      currentRecord.startTime = now;
    } else {
      currentRecord.count++;
    }

    rateLimitMap.set(ip, currentRecord);

    if (currentRecord.count > MAX_REQUESTS_PER_WINDOW) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        { status: 429, headers: { 'content-type': 'application/json', 'Retry-After': '60' } }
      );
    }
  }

  // Add security headers to the response
  const response = NextResponse.next();
  
  // CSP: Block everything not from self, but allow inline scripts/styles for Next.js and ThreeJS, 
  // and data: URIs for images.
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self' data:;
    connect-src 'self' https://integrate.api.nvidia.com https://*.mongodb.net;
    frame-src 'none';
    object-src 'none';
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
