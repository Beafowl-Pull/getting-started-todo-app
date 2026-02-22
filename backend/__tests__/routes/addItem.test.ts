import request = require('supertest');
import express = require('express');
import { Application } from 'express';
import addItem from '../../src/routes/addItem';
import { errorHandler } from '../../src/middleware/errorHandler';
import db from '../../src/persistence';
import { sampleTodo } from '../fixtures/todo';
import type { JwtPayload } from '../../src/types/user';

jest.mock('../../src/persistence');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

const mockDb = db as jest.Mocked<typeof db>;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

const USER_ID = 'user-uuid-1';

const app: Application = express();
app.use(express.json());
app.use((req, _res, next) => {
    req.user = { sub: USER_ID, email: 'test@example.com' };
    next();
});
app.post('/api/items', addItem);
app.use(errorHandler);

describe('POST /api/items', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDb.storeItem.mockResolvedValue();
    });

    it('should return 201 with the created item', async (): Promise<void> => {
        const res = await request(app).post('/api/items').send({ name: sampleTodo.name });

        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            id: 'mock-uuid-1234',
            name: sampleTodo.name,
            completed: false,
            user_id: USER_ID,
        });
        expect(mockDb.storeItem).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from the name', async (): Promise<void> => {
        const res = await request(app).post('/api/items').send({ name: '  Buy groceries  ' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Buy groceries');
    });

    it('should return 400 if name is missing', async (): Promise<void> => {
        const res = await request(app).post('/api/items').send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(mockDb.storeItem).not.toHaveBeenCalled();
    });

    it('should return 400 if name is an empty string', async (): Promise<void> => {
        const res = await request(app).post('/api/items').send({ name: '' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('should return 400 if name is only whitespace', async (): Promise<void> => {
        const res = await request(app).post('/api/items').send({ name: '   ' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('should return 400 if name is not a string', async (): Promise<void> => {
        const res = await request(app).post('/api/items').send({ name: 123 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('should return 500 if the database throws', async (): Promise<void> => {
        mockDb.storeItem.mockRejectedValue(new Error('Database error'));

        const res = await request(app).post('/api/items').send({ name: 'Buy groceries' });

        expect(res.status).toBe(500);
    });
});
