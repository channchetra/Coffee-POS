import type { APIRoute } from 'astro';
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getSessionByToken 
} from '../../../lib/db/server';

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
    
    const products = getAllProducts();
    
    return new Response(JSON.stringify({ products }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get products error:', error);
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
    
    const { name, category, priceUSDcents, imageUrl } = await request.json();
    
    if (!name || !category || priceUSDcents === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const id = crypto.randomUUID();
    createProduct(id, name, category, priceUSDcents, imageUrl || '');
    
    return new Response(JSON.stringify({ 
      success: true, 
      product: { id, name, category, priceUSDcents, imageUrl } 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create product error:', error);
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
    
    const { id, name, category, priceUSDcents, imageUrl } = await request.json();
    
    if (!id || !name || !category || priceUSDcents === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const existing = getProductById(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    updateProduct(id, name, category, priceUSDcents, imageUrl || '');
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update product error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const { error } = await requireAdmin(cookies);
    if (error) return error;
    
    const { id } = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Product ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    deleteProduct(id);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
