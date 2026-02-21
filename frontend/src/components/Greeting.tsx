import type { JSX } from 'react';
import { useEffect, useState } from 'react';

export function Greeting(): JSX.Element | null {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/greeting')
      .then(async (res): Promise<void> => {
        if (!res.ok) throw new Error(`Failed to fetch greeting: ${res.statusText}`);
        const data = (await res.json()) as { greeting: string };
        setGreeting(data.greeting);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      });
  }, []);

  if (error) return <p className="text-center text-danger">{error}</p>;
  if (!greeting) return null;

  return <h1 className="text-center mb-5">{greeting}</h1>;
}