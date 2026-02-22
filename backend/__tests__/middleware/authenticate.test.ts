import request from 'supertest';
import express, { Application } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/middleware/authenticate';

process.env['JWT_SECRET'] = 'test-secret';

const app: Application = express();
app.use(express.json());
app.get('/protected', authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

const makeToken = (payload: object, secret = 'test-secret', options?: jwt.SignOptions) =>
  jwt.sign(payload, secret, options);

describe('authenticate middleware', () => {
  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('should return 401 when Authorization header does not start with Bearer', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Basic sometoken');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('should return 401 for an invalid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('should return 401 for a token signed with wrong secret', async () => {
    const token = makeToken({ sub: 'user-1', email: 'test@example.com' }, 'wrong-secret');
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('should return 401 for an expired token', async () => {
    const token = makeToken(
      { sub: 'user-1', email: 'test@example.com' },
      'test-secret',
      { expiresIn: -1 },
    );
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('should call next and populate req.user for a valid token', async () => {
    const token = makeToken({ sub: 'user-1', email: 'test@example.com' }, 'test-secret');
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ sub: 'user-1', email: 'test@example.com' });
  });
});
