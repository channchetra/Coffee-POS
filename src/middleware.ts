import { defineMiddleware } from 'astro:middleware';
import { getSessionByToken } from './lib/db/server';

// Routes that require authentication
const protectedRoutes = ['/pos', '/admin', '/invoice'];

// Routes that are always public
const publicRoutes = ['/', '/login', '/api/auth/login', '/api/auth/logout'];

// API routes that require authentication
const protectedApiRoutes = ['/api/products', '/api/sync', '/api/settings', '/api/admin', '/api/upload'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const { cookies, redirect } = context;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname === route)) {
    return next();
  }
  
  // Allow static assets
  if (pathname.startsWith('/_') || 
      pathname.startsWith('/icons/') || 
      pathname.startsWith('/images/') ||
      pathname.startsWith('/uploads/') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.json') ||
      pathname === '/manifest.json' ||
      pathname === '/sw.js' ||
      pathname === '/favicon.svg') {
    return next();
  }
  
  // Check if route needs protection
  const isProtectedPage = protectedRoutes.some(route => pathname.startsWith(route));
  const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedPage || isProtectedApi) {
    const token = cookies.get('session')?.value;
    
    if (!token) {
      if (isProtectedApi) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      // Store the requested URL for redirect after login
      const redirectUrl = encodeURIComponent(pathname);
      return redirect(`/login?redirect=${redirectUrl}`);
    }
    
    // Validate session
    try {
      const session = getSessionByToken(token) as any;
      
      if (!session) {
        // Invalid or expired session
        cookies.delete('session', { path: '/' });
        
        if (isProtectedApi) {
          return new Response(JSON.stringify({ error: 'Session expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const redirectUrl = encodeURIComponent(pathname);
        return redirect(`/login?redirect=${redirectUrl}`);
      }
      
      // Check admin routes - only admin can access
      if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        if (session.role !== 'admin') {
          if (isProtectedApi) {
            return new Response(JSON.stringify({ error: 'Admin access required' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return redirect('/pos');
        }
      }
      
      // Attach user info to locals for use in pages
      context.locals.user = {
        id: session.userId,
        username: session.username,
        role: session.role
      };
      
    } catch (error) {
      console.error('Session validation error:', error);
      cookies.delete('session', { path: '/' });
      
      if (isProtectedApi) {
        return new Response(JSON.stringify({ error: 'Authentication error' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return redirect('/login');
    }
  }
  
  return next();
});
