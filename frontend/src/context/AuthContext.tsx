import type { JSX, ReactNode } from 'react';
import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import type { PublicUser, AuthState } from '../types/user';

const STORAGE_KEY = 'auth_token';

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: PublicUser) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  setUser: () => {},
});

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  const logout = useCallback((): void => {
    tokenRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY);

    if (!storedToken || isTokenExpired(storedToken)) {
      localStorage.removeItem(STORAGE_KEY);
      setIsLoading(false);
      return;
    }

    tokenRef.current = storedToken;

    fetch('/api/me', {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          logout();
          return;
        }
        const userData = (await res.json()) as PublicUser;
        setUser(userData);
      })
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? 'Login failed');
    }

    const data = (await res.json()) as { token: string; user: PublicUser };
    tokenRef.current = data.token;
    localStorage.setItem(STORAGE_KEY, data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Registration failed');
      }

      const data = (await res.json()) as { token: string; user: PublicUser };
      tokenRef.current = data.token;
      localStorage.setItem(STORAGE_KEY, data.token);
      setUser(data.user);
    },
    [],
  );

  const handleSetUser = useCallback((updatedUser: PublicUser): void => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: tokenRef.current,
        isLoading,
        login,
        register,
        logout,
        setUser: handleSetUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
