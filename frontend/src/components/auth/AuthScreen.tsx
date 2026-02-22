import type { JSX } from 'react';
import { useState } from 'react';
import Card from 'react-bootstrap/Card';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthScreen(): JSX.Element {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <Card className="p-4 mt-5">
      {mode === 'login' ? (
        <LoginForm onSwitchToRegister={() => setMode('register')} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setMode('login')} />
      )}
    </Card>
  );
}
