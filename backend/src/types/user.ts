export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // bcrypt hash — never sent to client
  created_at: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  created_at: string; // ISO 8601
}

export interface JwtPayload {
  sub: string; // user.id
  email: string;
}
