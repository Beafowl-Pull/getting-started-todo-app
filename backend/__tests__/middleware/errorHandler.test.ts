import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssueCode } from 'zod';
import { errorHandler, HttpError } from '../../src/middleware/errorHandler';

const makeApp = (
    handler: (req: Request, res: Response, next: NextFunction) => void,
): Application => {
    const app = express();
    app.use(express.json());
    app.get('/test', handler);
    app.use(errorHandler);
    return app;
};

describe('errorHandler middleware', () => {
    it('should return 400 for ZodError with the validation message', async () => {
        const app = makeApp((_req, _res, next) => {
            const zodError = new ZodError([
                { code: ZodIssueCode.custom, message: 'Name is required', path: ['name'] },
            ]);
            next(zodError);
        });

        const res = await request(app).get('/test');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Name is required');
    });

    it('should return the correct status for HttpError', async () => {
        const app = makeApp((_req, _res, next) => {
            next(new HttpError(404, 'Item not found'));
        });

        const res = await request(app).get('/test');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Item not found');
    });

    it('should return 500 for unknown errors', async () => {
        const app = makeApp((_req, _res, next) => {
            next(new Error('Unexpected crash'));
        });

        const res = await request(app).get('/test');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Internal server error');
    });
});

describe('HttpError', () => {
    it('should set the correct statusCode and message', () => {
        const err = new HttpError(403, 'Forbidden');

        expect(err.statusCode).toBe(403);
        expect(err.message).toBe('Forbidden');
        expect(err.name).toBe('HttpError');
    });
});