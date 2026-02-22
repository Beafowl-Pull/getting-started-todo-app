import request from 'supertest';
import express, { Application } from 'express';
import register from '../../../src/routes/auth/register';
import { errorHandler } from '../../../src/middleware/errorHandler';
import db from '../../../src/persistence';

process.env['JWT_SECRET'] = 'test-secret';
process.env['JWT_EXPIRES_IN'] = '15m';

jest.mock('../../../src/persistence');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

const mockDb = db as jest.Mocked<typeof db>;

const app: Application = express();
app.use(express.json());
app.post('/api/auth/register', register);
app.use(errorHandler);

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.findUserByEmail.mockResolvedValue(undefined);
    mockDb.createUser.mockResolvedValue();
  });

  it('should return 201 with token and public user on success', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      id: 'mock-uuid-1234',
      name: 'Test User',
      email: 'test@example.com',
    });
    expect(res.body.user).not.toHaveProperty('password');
    expect(mockDb.createUser).toHaveBeenCalledTimes(1);
  });

  it('should normalize email to lowercase', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'TEST@EXAMPLE.COM', password: 'password123' });

    expect(mockDb.findUserByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('should return 409 if email is already in use', async () => {
    mockDb.findUserByEmail.mockResolvedValue({
      id: 'existing-id',
      name: 'Existing',
      email: 'test@example.com',
      password: 'hash',
      created_at: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already in use');
    expect(mockDb.createUser).not.toHaveBeenCalled();
  });

  it('should return 400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('should return 400 if password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('should return 500 if db throws', async () => {
    mockDb.createUser.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(500);
  });
});
