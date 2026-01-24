import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/db/server';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get('session')?.value;
    
    if (token) {
      deleteSession(token);
    }
    
    cookies.delete('session', { path: '/' });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
