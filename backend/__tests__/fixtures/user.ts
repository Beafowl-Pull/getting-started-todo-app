import type { User, PublicUser } from '../../src/types/user';

export const sampleUser: User = {
  id: 'user-uuid-1',
  name: 'Test User',
  email: 'test@example.com',
  // bcrypt hash of 'password123' with cost 12
  password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfSqBWjmj/l.n0G',
  created_at: new Date('2024-01-01T00:00:00.000Z'),
};

export const samplePublicUser: PublicUser = {
  id: sampleUser.id,
  name: sampleUser.name,
  email: sampleUser.email,
  created_at: sampleUser.created_at.toISOString(),
};
