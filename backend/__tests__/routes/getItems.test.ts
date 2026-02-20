import request from 'supertest';
import express, { Application } from 'express';
import getItems from '../../src/routes/getItems';
import db from '../../src/persistence';
import { TodoItem } from '../../src/types/todo';

// Mock the persistence layer
jest.mock('../../src/persistence');
const mockDb = db as jest.Mocked<typeof db>;

const app: Application = express();
app.use(express.json());
app.get('/api/items', getItems);

const mockItems: TodoItem[] = [
  { id: '1', name: 'Buy groceries', completed: false },
  { id: '2', name: 'Do laundry', completed: true },
];

describe('GET /api/items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 with a list of items', async () => {
    mockDb.getItems.mockResolvedValue(mockItems);

    const res = await request(app).get('/api/items');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockItems);
    expect(mockDb.getItems).toHaveBeenCalledTimes(1);
  });

  it('should return an empty array when there are no items', async () => {
    mockDb.getItems.mockResolvedValue([]);

    const res = await request(app).get('/api/items');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return 500 if the database throws an error', async () => {
    mockDb.getItems.mockRejectedValue(new Error('Database error'));

    const res = await request(app).get('/api/items');

    expect(res.status).toBe(500);
  });
});