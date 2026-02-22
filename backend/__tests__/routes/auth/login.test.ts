import request from 'supertest';
import express, { Application } from 'express';
import bcrypt from 'bcrypt';
import login from '../../../src/routes/auth/login';
import { errorHandler } from '../../../src/middleware/errorHandler';
import db from '../../../src/persistence';

process.env['JWT_SECRET'] = 'test-secret';
process.env['JWT_EXPIRES_IN'] = '15m';

jest.mock('../../../src/persistence');

const mockDb = db as jest.Mocked<typeof db>;

const app: Application = express();
app.use(express.json());
app.post('/api/auth/login', login);
app.use(errorHandler);

describe('POST /api/auth/login', () => {
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('password123', 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 with token and public user on valid credentials', async () => {
    mockDb.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      created_at: new Date('2024-01-01'),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    });
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('should return 401 with "Invalid credentials" if user does not exist', async () => {
    mockDb.findUserByEmail.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should return 401 with "Invalid credentials" if password is wrong', async () => {
    mockDb.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      created_at: new Date('2024-01-01'),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should normalize email to lowercase', async () => {
    mockDb.findUserByEmail.mockResolvedValue(undefined);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'TEST@EXAMPLE.COM', password: 'password123' });

    expect(mockDb.findUserByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('should return 400 if email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('should return 400 if password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
  });

  it('should return 500 if db throws', async () => {
    mockDb.findUserByEmail.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(500);
  });
});
