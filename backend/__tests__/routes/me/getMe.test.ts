import request from 'supertest';
import express, { Application } from 'express';
import getMe from '../../../src/routes/me/getMe';
import { errorHandler } from '../../../src/middleware/errorHandler';
import db from '../../../src/persistence';
import { samplePublicUser, sampleUser } from '../../fixtures/user';

jest.mock('../../../src/persistence');
const mockDb = db as jest.Mocked<typeof db>;

// Inject req.user for tests
const app: Application = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { sub: sampleUser.id, email: sampleUser.email };
  next();
});
app.get('/api/me', getMe);
app.use(errorHandler);

describe('GET /api/me', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 200 with the public user', async () => {
    mockDb.findUserById.mockResolvedValue(sampleUser);

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(samplePublicUser);
    expect(res.body).not.toHaveProperty('password');
  });

  it('should return 404 if user not found', async () => {
    mockDb.findUserById.mockResolvedValue(undefined);

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('should return 500 if db throws', async () => {
    mockDb.findUserById.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(500);
  });
});
