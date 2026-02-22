import request = require('supertest');
import express = require('express');
import { Application } from 'express';
import updateItem from '../../src/routes/updateItem';
import { errorHandler } from '../../src/middleware/errorHandler';
import db from '../../src/persistence';
import { sampleTodo } from '../fixtures/todo';
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
app.put('/api/items/:id', updateItem);
app.use(errorHandler);

describe('PUT /api/items/:id', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDb.updateItem.mockResolvedValue();
    });

    it('should return 200 with the updated item when updating name', async (): Promise<void> => {
        const updated = { ...sampleTodo, name: 'Buy vegetables' };
        mockDb.getItem.mockResolvedValueOnce(sampleTodo).mockResolvedValueOnce(updated);

        const res = await request(app)
            .put(`/api/items/${sampleTodo.id}`)
            .send({ name: 'Buy vegetables' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Buy vegetables');
        expect(mockDb.updateItem).toHaveBeenCalledWith(sampleTodo.id, USER_ID, {
            name: 'Buy vegetables',
            completed: false,
        });
    });

    it('should return 200 when updating completed', async (): Promise<void> => {
        const updated = { ...sampleTodo, completed: true };
        mockDb.getItem.mockResolvedValueOnce(sampleTodo).mockResolvedValueOnce(updated);

        const res = await request(app).put(`/api/items/${sampleTodo.id}`).send({ completed: true });

        expect(res.status).toBe(200);
        expect(res.body.completed).toBe(true);
    });

    it('should trim whitespace from the name', async (): Promise<void> => {
        const updated = { ...sampleTodo, name: 'Buy vegetables' };
        mockDb.getItem.mockResolvedValueOnce(sampleTodo).mockResolvedValueOnce(updated);

        await request(app).put(`/api/items/${sampleTodo.id}`).send({ name: '  Buy vegetables  ' });

        expect(mockDb.updateItem).toHaveBeenCalledWith(sampleTodo.id, USER_ID, {
            name: 'Buy vegetables',
            completed: false,
        });
    });

    it('should return 404 if the item does not exist', async (): Promise<void> => {
        mockDb.getItem.mockResolvedValue(undefined);

        const res = await request(app).put('/api/items/nonexistent').send({ name: 'New name' });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
        expect(mockDb.updateItem).not.toHaveBeenCalled();
    });

    it('should return 400 if body is empty', async (): Promise<void> => {
        const res = await request(app).put(`/api/items/${sampleTodo.id}`).send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('should return 400 if name is empty string', async (): Promise<void> => {
        const res = await request(app).put(`/api/items/${sampleTodo.id}`).send({ name: '' });

        expect(res.status).toBe(400);
    });

    it('should return 400 if completed is not a boolean', async (): Promise<void> => {
        const res = await request(app)
            .put(`/api/items/${sampleTodo.id}`)
            .send({ completed: 'yes' });

        expect(res.status).toBe(400);
    });

    it('should return 500 if the database throws', async (): Promise<void> => {
        mockDb.getItem.mockRejectedValue(new Error('Database error'));

        const res = await request(app)
            .put(`/api/items/${sampleTodo.id}`)
            .send({ name: 'New name' });

        expect(res.status).toBe(500);
    });
});
