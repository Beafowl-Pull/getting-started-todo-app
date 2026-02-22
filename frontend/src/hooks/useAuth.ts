import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue } from '../context/AuthContext';

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
