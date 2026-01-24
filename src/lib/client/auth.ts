import { cacheUser, getCachedUser, type CachedUser } from './db';

// Simple hash for offline verification (not cryptographically secure, but sufficient for offline check)
async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'cashier';
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  isOffline?: boolean;
}

export async function loginOnline(username: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Login failed' };
    }
    
    // Cache user for offline login
    const offlineHash = await simpleHash(`${username}:${password}`);
    await cacheUser({
      id: data.user.id,
      username: data.user.username,
      passwordHash: offlineHash,
      role: data.user.role,
      lastLoginAt: new Date().toISOString()
    });
    
    return {
      success: true,
      user: {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role
      }
    };
  } catch (error) {
    // Network error - try offline login
    return { success: false, error: 'Network error. Try offline login.' };
  }
}

export async function loginOffline(username: string, password: string): Promise<LoginResult> {
  const cachedUser = await getCachedUser(username);
  
  if (!cachedUser) {
    return { 
      success: false, 
      error: 'No cached credentials. Please login online first.',
      isOffline: true 
    };
  }
  
  const inputHash = await simpleHash(`${username}:${password}`);
  
  if (inputHash !== cachedUser.passwordHash) {
    return { 
      success: false, 
      error: 'Invalid credentials',
      isOffline: true 
    };
  }
  
  return {
    success: true,
    user: {
      id: cachedUser.id,
      username: cachedUser.username,
      role: cachedUser.role
    },
    isOffline: true
  };
}

export async function login(username: string, password: string): Promise<LoginResult> {
  if (navigator.onLine) {
    const result = await loginOnline(username, password);
    if (result.success) return result;
    // If online login fails due to network, try offline
    if (result.error?.includes('Network')) {
      return loginOffline(username, password);
    }
    return result;
  } else {
    return loginOffline(username, password);
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore network errors during logout
  }
  sessionStorage.removeItem('user');
}

export function getCurrentUser(): AuthUser | null {
  const userStr = sessionStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthUser): void {
  sessionStorage.setItem('user', JSON.stringify(user));
}

export function clearCurrentUser(): void {
  sessionStorage.removeItem('user');
}
