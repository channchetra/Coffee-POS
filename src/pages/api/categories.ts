import type { APIRoute } from 'astro';
import { getAllCategories, getSessionByToken } from '../../lib/db';

// Role-agnostic read endpoint: any authenticated user (cashier or admin) needs
// the category list for POS tabs. Admin CRUD stays at /api/admin/categories.
export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Authentication is handled by middleware, but double-check here
    const token = cookies.get('session')?.value;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = getSessionByToken(token);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const categories = getAllCategories();

    return new Response(JSON.stringify({ categories }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
