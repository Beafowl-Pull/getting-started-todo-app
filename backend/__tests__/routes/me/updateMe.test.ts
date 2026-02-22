import request from 'supertest';
import express, { Application } from 'express';
import bcrypt from 'bcrypt';
import updateMe from '../../../src/routes/me/updateMe';
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
app.patch('/api/me', updateMe);
app.use(errorHandler);

describe('PATCH /api/me', () => {
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('correctpassword', 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.updateUser.mockResolvedValue();
  });

  it('should return 200 when updating name only (no password needed)', async () => {
    const updatedUser = { ...sampleUser, name: 'New Name' };
    mockDb.findUserById
      .mockResolvedValueOnce(sampleUser)
      .mockResolvedValueOnce(updatedUser);

    const res = await request(app)
      .patch('/api/me')
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(mockDb.updateUser).toHaveBeenCalledWith(sampleUser.id, { name: 'New Name' });
  });

  it('should return 200 when updating email with correct currentPassword', async () => {
    const userWithHash = { ...sampleUser, password: hashedPassword };
    const updatedUser = { ...sampleUser, email: 'new@example.com' };
    mockDb.findUserById
      .mockResolvedValueOnce(userWithHash)
      .mockResolvedValueOnce(updatedUser);

    const res = await request(app)
      .patch('/api/me')
      .send({ email: 'new@example.com', currentPassword: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('new@example.com');
  });

  it('should return 403 if currentPassword is incorrect when changing email', async () => {
    const userWithHash = { ...sampleUser, password: hashedPassword };
    mockDb.findUserById.mockResolvedValue(userWithHash);

    const res = await request(app)
      .patch('/api/me')
      .send({ email: 'new@example.com', currentPassword: 'wrongpassword' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Current password is incorrect');
  });

  it('should return 400 if currentPassword is missing when changing email', async () => {
    const res = await request(app)
      .patch('/api/me')
      .send({ email: 'new@example.com' });

    expect(res.status).toBe(400);
  });

  it('should return 400 if currentPassword is missing when changing password', async () => {
    const res = await request(app)
      .patch('/api/me')
      .send({ newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
  });

  it('should return 404 if user not found', async () => {
    mockDb.findUserById.mockResolvedValue(undefined);

    const res = await request(app)
      .patch('/api/me')
      .send({ name: 'New Name' });

    expect(res.status).toBe(404);
  });

  it('should return 500 if db throws', async () => {
    mockDb.findUserById.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .patch('/api/me')
      .send({ name: 'New Name' });

    expect(res.status).toBe(500);
  });
});
