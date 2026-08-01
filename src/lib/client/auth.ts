import { cacheUser, getCachedUser, type CachedUser } from './db';
import { sha256Hex } from '../utils/sha256';

// Simple hash for offline verification (not cryptographically secure, but sufficient for offline check)
async function simpleHash(str: string): Promise<string> {
  return sha256Hex(str);
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
  /** True when the server could not be reached (network error / timeout), regardless of navigator.onLine */
  networkError?: boolean;
}

// Server reachability can be wrong (e.g. WiFi up but POS server down), so bound
// the login request and treat a timeout the same as being offline.
const LOGIN_TIMEOUT_MS = 8000;

export async function loginOnline(username: string, password: string, rememberMe: boolean = false): Promise<LoginResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    
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
    // Network error or timeout - try offline login
    return { success: false, error: 'Server unreachable. Try offline login.', networkError: true };
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

export async function login(username: string, password: string, rememberMe: boolean = false): Promise<LoginResult> {
  if (navigator.onLine) {
    const result = await loginOnline(username, password, rememberMe);
    if (result.success) return result;
    // If online login failed because the server is unreachable, fall back to cached credentials
    if (result.networkError) {
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
  // Clear from both storages
  sessionStorage.removeItem('user');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberMe');
}

export function getCurrentUser(): AuthUser | null {
  // Check sessionStorage first, then localStorage (for "remember me")
  const sessionUser = sessionStorage.getItem('user');
  const localUser = localStorage.getItem('user');
  const userStr = sessionUser || localUser;
  
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthUser, rememberMe: boolean = false): void {
  if (rememberMe) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('rememberMe', 'true');
  } else {
    sessionStorage.setItem('user', JSON.stringify(user));
  }
}

export function clearCurrentUser(): void {
  sessionStorage.removeItem('user');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberMe');
}

export function isRemembered(): boolean {
  return localStorage.getItem('rememberMe') === 'true';
}
