import type { APIRoute } from 'astro';
import { 
  getAllCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getCategoryBySlug,
  getSessionByToken 
} from '../../../lib/db';

export const GET: APIRoute = async ({ cookies }) => {
  try {
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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('session')?.value;
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const session = getSessionByToken(token) as any;
    
    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { nameEn, nameKm, slug, sortOrder = 0 } = await request.json();
    
    if (!nameEn || !nameKm || !slug) {
      return new Response(JSON.stringify({ error: 'English name, Khmer name, and slug are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if slug already exists
    const existing = getCategoryBySlug(slug);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Category with this slug already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const id = crypto.randomUUID();
    createCategory(id, nameEn, nameKm, slug, sortOrder);
    
    return new Response(JSON.stringify({ 
      category: { id, nameEn, nameKm, slug, sortOrder } 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create category error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('session')?.value;
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const session = getSessionByToken(token) as any;
    
    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { id, nameEn, nameKm, slug, sortOrder = 0 } = await request.json();
    
    if (!id || !nameEn || !nameKm || !slug) {
      return new Response(JSON.stringify({ error: 'ID, English name, Khmer name, and slug are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    updateCategory(id, nameEn, nameKm, slug, sortOrder);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update category error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('session')?.value;
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const session = getSessionByToken(token) as any;
    
    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { id } = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Category ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    deleteCategory(id);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
