import type { APIRoute } from 'astro';
import { getUserByUsername, createSession } from '../../../lib/db/server';
import { verifyPassword, generateToken } from '../../../lib/auth/password';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const user = getUserByUsername(username) as any;
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const valid = await verifyPassword(password, user.passwordHash);
    
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create session
    const token = generateToken();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
    createSession(sessionId, user.id, token, expiresAt);
    
    // Set cookie
    cookies.set('session', token, {
      path: '/',
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours in seconds
    });
    
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
