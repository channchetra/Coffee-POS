import type { APIRoute } from 'astro';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  getSessionByToken 
} from '../../../lib/db';
import { hashPassword } from '../../../lib/auth/password';

// Middleware to check admin
async function requireAdmin(cookies: any): Promise<{ error?: Response; session?: any }> {
  const token = cookies.get('session')?.value;
  
  if (!token) {
    return {
      error: new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }
  
  const session = getSessionByToken(token) as any;
  
  if (!session || session.role !== 'admin') {
    return {
      error: new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }
  
  return { session };
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const { error } = await requireAdmin(cookies);
    if (error) return error;
    
    const users = getAllUsers();
    
    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { error } = await requireAdmin(cookies);
    if (error) return error;
    
    const { username, password, role } = await request.json();
    
    if (!username || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (role !== 'admin' && role !== 'cashier') {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    createUser(id, username, passwordHash, role);
    
    return new Response(JSON.stringify({ 
      success: true, 
      user: { id, username, role } 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const { error } = await requireAdmin(cookies);
    if (error) return error;
    
    const { id, username, password, role } = await request.json();
    
    if (!id || !username || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const existing = getUserById(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (password) {
      const passwordHash = await hashPassword(password);
      updateUser(id, username, role, passwordHash);
    } else {
      updateUser(id, username, role);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const { error, session } = await requireAdmin(cookies);
    if (error) return error;
    
    const { id } = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Prevent self-deletion
    if (id === session.userId) {
      return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    deleteUser(id);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot delete a user with invoices') {
      return new Response(JSON.stringify({ error: 'Cannot delete a user with invoices. Reassign their invoices first.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('Delete user error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
