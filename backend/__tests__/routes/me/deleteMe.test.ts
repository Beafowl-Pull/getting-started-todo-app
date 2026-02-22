import request from 'supertest';
import express, { Application } from 'express';
import bcrypt from 'bcrypt';
import deleteMe from '../../../src/routes/me/deleteMe';
import { errorHandler } from '../../../src/middleware/errorHandler';
import db from '../../../src/persistence';
import { sampleUser } from '../../fixtures/user';

jest.mock('../../../src/persistence');
const mockDb = db as jest.Mocked<typeof db>;

const app: Application = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { sub: sampleUser.id, email: sampleUser.email };
  next();
});
app.delete('/api/me', deleteMe);
app.use(errorHandler);

describe('DELETE /api/me', () => {
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('correctpassword', 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.deleteUser.mockResolvedValue();
  });

  it('should return 204 when password is correct', async () => {
    const userWithHash = { ...sampleUser, password: hashedPassword };
    mockDb.findUserById.mockResolvedValue(userWithHash);

    const res = await request(app)
      .delete('/api/me')
      .send({ password: 'correctpassword' });

    expect(res.status).toBe(204);
    expect(mockDb.deleteUser).toHaveBeenCalledWith(sampleUser.id);
  });

  it('should return 403 when password is incorrect', async () => {
    const userWithHash = { ...sampleUser, password: hashedPassword };
    mockDb.findUserById.mockResolvedValue(userWithHash);

    const res = await request(app)
      .delete('/api/me')
      .send({ password: 'wrongpassword' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Password is incorrect');
    expect(mockDb.deleteUser).not.toHaveBeenCalled();
  });

  it('should return 400 if password is missing', async () => {
    const res = await request(app).delete('/api/me').send({});

    expect(res.status).toBe(400);
    expect(mockDb.deleteUser).not.toHaveBeenCalled();
  });

  it('should return 404 if user not found', async () => {
    mockDb.findUserById.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/me')
      .send({ password: 'correctpassword' });

    expect(res.status).toBe(404);
  });

  it('should return 500 if db throws', async () => {
    mockDb.findUserById.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .delete('/api/me')
      .send({ password: 'correctpassword' });

    expect(res.status).toBe(500);
  });
});
