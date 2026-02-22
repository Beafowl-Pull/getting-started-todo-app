export interface PublicUser {
  id: string;
  name: string;
  email: string;
  created_at: string; // ISO 8601
}

export interface AuthState {
  user: PublicUser | null;
  token: string | null;
  isLoading: boolean;
}
