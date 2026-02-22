import request = require('supertest');
import express = require('express');
import { Application } from 'express';
import getItems from '../../src/routes/getItems';
import db from '../../src/persistence';
import { TodoItem } from '../../src/types/todo';
import type { JwtPayload } from '../../src/types/user';

jest.mock('../../src/persistence');
const mockDb = db as jest.Mocked<typeof db>;

const USER_ID = 'user-uuid-1';

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
    req.user = { sub: USER_ID, email: 'test@example.com' };
    next();
});
app.get('/api/items', getItems);

const mockItems: TodoItem[] = [
    { id: '1', name: 'Buy groceries', completed: false, user_id: USER_ID },
    { id: '2', name: 'Do laundry', completed: true, user_id: USER_ID },
];

describe('GET /api/items', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 200 with a list of items', async (): Promise<void> => {
        mockDb.getItems.mockResolvedValue(mockItems);

        const res = await request(app).get('/api/items');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockItems);
        expect(mockDb.getItems).toHaveBeenCalledWith(USER_ID);
    });

    it('should return an empty array when there are no items', async (): Promise<void> => {
        mockDb.getItems.mockResolvedValue([]);

        const res = await request(app).get('/api/items');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('should return 500 if the database throws an error', async (): Promise<void> => {
        mockDb.getItems.mockRejectedValue(new Error('Database error'));

        const res = await request(app).get('/api/items');

        expect(res.status).toBe(500);
    });
});
