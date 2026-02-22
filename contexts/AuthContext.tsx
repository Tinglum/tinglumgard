"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface User {
  name: string;
  email: string;
  phoneNumber: string;
  isAdmin?: boolean;
  isImpersonating?: boolean;
  impersonatorName?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes inactivity timeout
const LAST_ACTIVITY_WRITE_THROTTLE = 5000;
const LAST_ACTIVITY_KEY = 'lastActivityTime';
const SESSION_EXPIRED_KEY = 'tinglum_session_expired';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedActivityRef = useRef<number>(0);

  const clearSessionTimeout = useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const updateLastActivity = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastPersistedActivityRef.current < LAST_ACTIVITY_WRITE_THROTTLE) {
      return;
    }
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    lastPersistedActivityRef.current = now;
  }, []);

  const getInactiveMs = useCallback(() => {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return 0;
    const parsed = parseInt(lastActivity, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Date.now() - parsed;
  }, []);

  const logout = useCallback(async (reason?: 'expired' | 'manual') => {
    try {
      if (reason === 'expired') {
        localStorage.setItem(SESSION_EXPIRED_KEY, '1');
      }
      await fetch('/api/auth/vipps/logout', { method: 'POST' });
      setUser(null);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      clearSessionTimeout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [clearSessionTimeout]);

  const scheduleSessionTimeout = useCallback(() => {
    if (!user) return;
    clearSessionTimeout();
    timeoutRef.current = setTimeout(() => {
      const inactiveMs = getInactiveMs();
      if (inactiveMs < SESSION_TIMEOUT) {
        scheduleSessionTimeout();
        return;
      }
      console.log('Session timed out after 10 minutes of inactivity');
      logout('expired');
    }, SESSION_TIMEOUT);
  }, [clearSessionTimeout, getInactiveMs, logout, user]);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
          updateLastActivity(true);
        } else {
          setUser(null);
          clearSessionTimeout();
        }
      } else {
        setUser(null);
        clearSessionTimeout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      clearSessionTimeout();
    } finally {
      setIsLoading(false);
    }
  }, [clearSessionTimeout, updateLastActivity]);

  useEffect(() => {
    const expiredFlag = localStorage.getItem(SESSION_EXPIRED_KEY);
    if (!expiredFlag) return;
    localStorage.removeItem(SESSION_EXPIRED_KEY);
    toast({
      title: t.common.sessionExpiredTitle,
      description: t.common.sessionExpiredDescription,
    });
  }, [toast, t.common.sessionExpiredDescription, t.common.sessionExpiredTitle]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Setup activity listeners and timeout
  useEffect(() => {
    if (!user) {
      clearSessionTimeout();
      return;
    }

    if (getInactiveMs() > SESSION_TIMEOUT) {
      logout('expired');
      return;
    }

    scheduleSessionTimeout();

    // User activity events that reset inactivity timeout.
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      updateLastActivity();
      scheduleSessionTimeout();
    };

    // Keep tabs in sync: activity in one tab should keep session alive in others.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LAST_ACTIVITY_KEY) return;
      scheduleSessionTimeout();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    window.addEventListener('storage', handleStorage);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorage);
      clearSessionTimeout();
    };
  }, [clearSessionTimeout, getInactiveMs, logout, scheduleSessionTimeout, updateLastActivity, user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
