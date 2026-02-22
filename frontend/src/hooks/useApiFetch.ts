import { useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export function useApiFetch() {
  const { logout } = useAuth();
  const tokenRef = useRef<string | null>(null);

  // Keep tokenRef updated with the latest token from localStorage
  const getToken = useCallback((): string | null => {
    return localStorage.getItem('auth_token');
  }, []);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = getToken();
      tokenRef.current = token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, { ...options, headers });

      if (res.status === 401) {
        logout();
      }

      return res;
    },
    [getToken, logout],
  );

  return apiFetch;
}
