"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface User {
  name: string;
  email: string;
  phoneNumber: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const LAST_ACTIVITY_KEY = 'lastActivityTime';
const SESSION_EXPIRED_KEY = 'tinglum_session_expired';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
          updateLastActivity();
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (reason?: 'expired' | 'reload' | 'manual') => {
    try {
      if (reason && reason !== 'manual') {
        localStorage.setItem(SESSION_EXPIRED_KEY, '1');
      }
      await fetch('/api/auth/vipps/logout', { method: 'POST' });
      setUser(null);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateLastActivity = () => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  };

  const checkSessionTimeout = () => {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        console.log('Session timed out after 30 minutes of inactivity');
        logout('expired');
        return;
      }
    }
  };

  const resetTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (user) {
      updateLastActivity();
      const newTimeoutId = setTimeout(() => {
        console.log('Auto-logout triggered');
        logout('expired');
      }, SESSION_TIMEOUT);
      setTimeoutId(newTimeoutId);
    }
  };

  useEffect(() => {
    const expiredFlag = localStorage.getItem(SESSION_EXPIRED_KEY);
    if (!expiredFlag) return;
    localStorage.removeItem(SESSION_EXPIRED_KEY);
    toast({
      title: 'Sesjonen er utlopet',
      description: 'Logg inn igjen for a fortsette.',
    });
  }, [toast]);

  // Check auth on mount
  useEffect(() => {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navEntry?.type === 'reload') {
      logout('reload');
      return;
    }
    checkAuth();
  }, []);

  // Setup activity listeners and timeout
  useEffect(() => {
    if (!user) return;

    // Check if session already timed out
    checkSessionTimeout();

    // Setup timeout
    resetTimeout();

    // Activity events that reset the timeout
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimeout();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user]);

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
