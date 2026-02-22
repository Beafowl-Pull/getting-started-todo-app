export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  created_at: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}
