import request = require('supertest');
import express = require('express');
import { Application } from 'express';
import exportMe from '../../../src/routes/me/exportMe';
import { errorHandler } from '../../../src/middleware/errorHandler';
import db from '../../../src/persistence';
import { sampleUser, samplePublicUser } from '../../fixtures/user';
import { todoFixtures } from '../../fixtures/todo';
import type { JwtPayload } from '../../../src/types/user';

jest.mock('../../../src/persistence');
const mockDb = db as jest.Mocked<typeof db>;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

const app: Application = express();
app.use(express.json());
app.use((req, _res, next) => {
    req.user = { sub: sampleUser.id, email: sampleUser.email };
    next();
});
app.get('/api/me/export', exportMe);
app.use(errorHandler);

describe('GET /api/me/export', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return 200 with export data', async (): Promise<void> => {
        mockDb.getAllUserData.mockResolvedValue({
            user: samplePublicUser,
            todos: todoFixtures,
        });

        const res = await request(app).get('/api/me/export');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('exportedAt');
        expect(res.body.user).toEqual(samplePublicUser);
        expect(res.body.todos).toEqual(todoFixtures);
    });

    it('should return 500 if db throws', async (): Promise<void> => {
        mockDb.getAllUserData.mockRejectedValue(new Error('DB error'));

        const res = await request(app).get('/api/me/export');

        expect(res.status).toBe(500);
    });
});
