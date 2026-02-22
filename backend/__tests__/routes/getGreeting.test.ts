import request = require('supertest');
import express = require('express');
import { Application } from 'express';
import getGreeting from '../../src/routes/getGreeting';

const app: Application = express();
app.use(express.json());
app.get('/api/greeting', getGreeting);

describe('GET /api/greeting', () => {
    it('should return 200 with a greeting message', async (): Promise<void> => {
        const res = await request(app).get('/api/greeting');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('greeting');
        expect(res.body.greeting).toBe('Hello world!');
    });

    it('should return JSON content-type', async (): Promise<void> => {
        const res = await request(app).get('/api/greeting');

        expect(res.headers['content-type']).toMatch(/application\/json/);
    });
});