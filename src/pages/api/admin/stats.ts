import type { APIRoute } from 'astro';
import { getStats, getSessionByToken, getAllUsers } from '../../../lib/db';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const token = cookies.get('session')?.value;
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
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
    
    // Get period from query params (today, week, month)
    const period = url.searchParams.get('period') as 'today' | 'week' | 'month' || 'today';
    const validPeriods = ['today', 'week', 'month'];
    const selectedPeriod = validPeriods.includes(period) ? period : 'today';
    
    // Get cashier filter (optional)
    const cashierId = url.searchParams.get('cashierId') || undefined;
    
    const stats = getStats(selectedPeriod as 'today' | 'week' | 'month', cashierId);
    
    // Get all users for the filter dropdown
    const users = getAllUsers();
    
    return new Response(JSON.stringify({ stats, users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
