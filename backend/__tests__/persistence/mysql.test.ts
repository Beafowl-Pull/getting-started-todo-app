import { TodoItem } from '../../src/types/todo';

jest.mock('wait-port', () => jest.fn().mockResolvedValue({}));

const mockQuery = jest.fn();
const mockPoolEnd = jest.fn();

jest.mock('mysql2', () => ({
  createPool: jest.fn(() => ({
    query: mockQuery,
    end: mockPoolEnd,
  })),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn((path: string) => `mocked-${path}`),
}));

process.env.MYSQL_HOST = 'localhost';
process.env.MYSQL_USER = 'user';
process.env.MYSQL_PASSWORD = 'password';
process.env.MYSQL_DB = 'todo_db';

import db from '../../src/persistence/mysql';

const sampleItem: TodoItem = {
  id: 'test-uuid-1',
  name: 'Test todo',
  completed: false,
};

const mockRow = { id: 'test-uuid-1', name: 'Test todo', completed: 0 };

describe('MySQL persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('init()', () => {
    it('should create the pool and the table on success', async () => {
      mockQuery.mockImplementation((_sql: string, cb: Function) => cb(null));

      await expect(db.init()).resolves.toBeUndefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS todo_items'),
        expect.any(Function),
      );
    });

    it('should reject if the CREATE TABLE query fails', async () => {
      mockQuery.mockImplementation((_sql: string, cb: Function) =>
        cb(new Error('DB error')),
      );

      await expect(db.init()).rejects.toThrow('DB error');
    });
  });

  describe('teardown()', () => {
    it('should close the pool successfully', async () => {
      mockPoolEnd.mockImplementation((cb: Function) => cb(null));

      await expect(db.teardown()).resolves.toBeUndefined();
    });

    it('should reject if pool.end fails', async () => {
      mockPoolEnd.mockImplementation((cb: Function) =>
        cb(new Error('Close error')),
      );

      await expect(db.teardown()).rejects.toThrow('Close error');
    });
  });

  describe('getItems()', () => {
    it('should return all items with completed as boolean', async () => {
      mockQuery.mockImplementation((_sql: string, cb: Function) =>
        cb(null, [mockRow, { ...mockRow, id: '2', completed: 1 }]),
      );

      const items = await db.getItems();

      expect(items).toHaveLength(2);
      expect(items[0]?.completed).toBe(false);
      expect(items[1]?.completed).toBe(true);
    });

    it('should return an empty array when no items exist', async () => {
      mockQuery.mockImplementation((_sql: string, cb: Function) =>
        cb(null, []),
      );

      const items = await db.getItems();
      expect(items).toEqual([]);
    });

    it('should reject if the query fails', async () => {
      mockQuery.mockImplementation((_sql: string, cb: Function) =>
        cb(new Error('Query error')),
      );

      await expect(db.getItems()).rejects.toThrow('Query error');
    });
  });

  describe('getItem()', () => {
    it('should return the correct item by id', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(null, [mockRow]),
      );

      const item = await db.getItem('test-uuid-1');
      expect(item).toEqual(sampleItem);
    });

    it('should return undefined if item does not exist', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(null, []),
      );

      const item = await db.getItem('nonexistent');
      expect(item).toBeUndefined();
    });

    it('should reject if the query fails', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(new Error('Query error')),
      );

      await expect(db.getItem('test-uuid-1')).rejects.toThrow('Query error');
    });
  });

  describe('storeItem()', () => {
    it('should insert the item successfully', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(null),
      );

      await expect(db.storeItem(sampleItem)).resolves.toBeUndefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO todo_items'),
        ['test-uuid-1', 'Test todo', 0],
        expect.any(Function),
      );
    });

    it('should store completed=true as 1', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(null),
      );

      await db.storeItem({ ...sampleItem, completed: true });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['test-uuid-1', 'Test todo', 1],
        expect.any(Function),
      );
    });

    it('should reject if the query fails', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(new Error('Insert error')),
      );

      await expect(db.storeItem(sampleItem)).rejects.toThrow('Insert error');
    });
  });

  describe('updateItem()', () => {
    it('should update the item successfully', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(null),
      );

      await expect(
        db.updateItem('test-uuid-1', { name: 'Updated', completed: true }),
      ).resolves.toBeUndefined();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE todo_items'),
        ['Updated', 1, 'test-uuid-1'],
        expect.any(Function),
      );
    });

    it('should reject if the query fails', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(new Error('Update error')),
      );

      await expect(
        db.updateItem('test-uuid-1', { name: 'Updated', completed: false }),
      ).rejects.toThrow('Update error');
    });
  });

  describe('removeItem()', () => {
    it('should return true when an item is deleted', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(null, { affectedRows: 1 }),
      );

      const result = await db.removeItem('test-uuid-1');
      expect(result).toBe(true);
    });

    it('should return false when no item was deleted', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(null, { affectedRows: 0 }),
      );

      const result = await db.removeItem('nonexistent');
      expect(result).toBe(false);
    });

    it('should reject if the query fails', async () => {
      mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
        cb(new Error('Delete error')),
      );

      await expect(db.removeItem('test-uuid-1')).rejects.toThrow('Delete error');
    });
  });
});

describe('readSecret()', () => {
  it('should throw if neither file path nor env variable is defined', async () => {
    const backup = {
      MYSQL_HOST: process.env.MYSQL_HOST,
      MYSQL_USER: process.env.MYSQL_USER,
      MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
      MYSQL_DB: process.env.MYSQL_DB,
    };

    delete process.env.MYSQL_HOST;
    delete process.env.MYSQL_USER;
    delete process.env.MYSQL_PASSWORD;
    delete process.env.MYSQL_DB;

    jest.resetModules();
    const freshDb = (await import('../../src/persistence/mysql')).default;

    await expect(freshDb.init()).rejects.toThrow(
      'Missing required environment variable (file or value)',
    );

    process.env.MYSQL_HOST = backup.MYSQL_HOST;
    process.env.MYSQL_USER = backup.MYSQL_USER;
    process.env.MYSQL_PASSWORD = backup.MYSQL_PASSWORD;
    process.env.MYSQL_DB = backup.MYSQL_DB;
    jest.resetModules();
  });
});