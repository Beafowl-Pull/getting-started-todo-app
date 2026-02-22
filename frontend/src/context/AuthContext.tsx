import type { JSX, ReactNode } from 'react';
import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import type { PublicUser, AuthState } from '../types/user';

const STORAGE_KEY = 'auth_token';

export interface AuthContextValue extends AuthState {
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

const getInitialToken = (): string | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || isTokenExpired(stored)) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
    return stored;
};

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
    const [initialToken] = useState<string | null>(getInitialToken);

    const [user, setUser] = useState<PublicUser | null>(null);
    const [token, setToken] = useState<string | null>(initialToken);
    const [isLoading, setIsLoading] = useState(initialToken !== null);
    const tokenRef = useRef<string | null>(initialToken);

    const logout = useCallback((): void => {
        tokenRef.current = null;
        setToken(null);
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
    }, []);

    useEffect(() => {
        if (!initialToken) return;

        fetch('/api/me', {
            headers: { Authorization: `Bearer ${initialToken}` },
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
    }, [logout, initialToken]);

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
        setToken(data.token);
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
            setToken(data.token);
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
                token,
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
