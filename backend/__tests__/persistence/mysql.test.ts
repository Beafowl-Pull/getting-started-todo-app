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

const USER_ID = 'user-uuid-1';

const sampleItem: TodoItem = {
  id: 'test-uuid-1',
  name: 'Test todo',
  completed: false,
  user_id: USER_ID,
};

const mockRow = { id: 'test-uuid-1', name: 'Test todo', completed: 0, user_id: USER_ID };

describe('MySQL persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('init()', () => {
    it('should create the pool and the tables on success', async (): Promise<void> => {
        mockQuery
            .mockImplementationOnce((_sql: string, _v: unknown[], cb: Function) => cb(null))
            .mockImplementationOnce((_sql: string, _v: unknown[], cb: Function) =>
                cb(null, [{ count: 1 }]),
            )
            .mockImplementationOnce((_sql: string, _v: unknown[], cb: Function) => cb(null))
            .mockImplementationOnce((_sql: string, _v: unknown[], cb: Function) => cb(null));

        await expect(db.init()).resolves.toBeUndefined();
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('CREATE TABLE IF NOT EXISTS todo_items'),
            expect.any(Array),
            expect.any(Function),
        );
    });

    it('should run ALTER TABLE when user_id column is missing', async (): Promise<void> => {
        mockQuery
            .mockImplementationOnce((_sql: string, _v: unknown[], cb: Function) => cb(null))
            .mockImplementationOnce((_sql: string, _v: unknown[], cb: Function) =>
                cb(null, [{ count: 0 }]),
            )
            .mockImplementationOnce((_sql: string, _v: unknown[], cb: Function) => cb(null))
            .mockImplementationOnce((_sql: string, _v: unknown[], cb: Function) => cb(null))
            .mockImplementationOnce((_sql: string, _v: unknown[], cb: Function) => cb(null));

        await expect(db.init()).resolves.toBeUndefined();
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('ALTER TABLE todo_items ADD COLUMN user_id'),
            expect.any(Array),
            expect.any(Function),
        );
    });

    it('should reject if the CREATE TABLE query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _v: unknown[], cb: Function) =>
            cb(new Error('DB error')),
        );

        await expect(db.init()).rejects.toThrow('DB error');
    });
  });

  describe('teardown()', () => {
    it('should close the pool successfully', async (): Promise<void> => {
        mockPoolEnd.mockImplementation((cb: Function) => cb(null));

        await expect(db.teardown()).resolves.toBeUndefined();
    });

    it('should reject if pool.end fails', async (): Promise<void> => {
        mockPoolEnd.mockImplementation((cb: Function) => cb(new Error('Close error')));

        await expect(db.teardown()).rejects.toThrow('Close error');
    });
  });

  describe('getItems()', () => {
    it('should return all items for userId with completed as boolean', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, [mockRow, { ...mockRow, id: '2', completed: 1 }]),
        );

        const items = await db.getItems(USER_ID);

        expect(items).toHaveLength(2);
        expect(items[0]?.completed).toBe(false);
        expect(items[1]?.completed).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE user_id = ?'),
            [USER_ID],
            expect.any(Function),
        );
    });

    it('should return an empty array when no items exist', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, []),
        );

        const items = await db.getItems(USER_ID);
        expect(items).toEqual([]);
    });

    it('should reject if the query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Query error')),
        );

        await expect(db.getItems(USER_ID)).rejects.toThrow('Query error');
    });
  });

  describe('getItem()', () => {
    it('should return the correct item by id and userId', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, [mockRow]),
        );

        const item = await db.getItem('test-uuid-1', USER_ID);
        expect(item).toEqual(sampleItem);
    });

    it('should return undefined if item does not exist', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, []),
        );

        const item = await db.getItem('nonexistent', USER_ID);
        expect(item).toBeUndefined();
    });

    it('should reject if the query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Query error')),
        );

        await expect(db.getItem('test-uuid-1', USER_ID)).rejects.toThrow('Query error');
    });
  });

  describe('storeItem()', () => {
    it('should insert the item successfully', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) => cb(null));

        await expect(db.storeItem(sampleItem)).resolves.toBeUndefined();
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO todo_items'),
            ['test-uuid-1', 'Test todo', 0, USER_ID],
            expect.any(Function),
        );
    });

    it('should store completed=true as 1', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) => cb(null));

        await db.storeItem({ ...sampleItem, completed: true });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            ['test-uuid-1', 'Test todo', 1, USER_ID],
            expect.any(Function),
        );
    });

    it('should reject if the query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Insert error')),
        );

        await expect(db.storeItem(sampleItem)).rejects.toThrow('Insert error');
    });
  });

  describe('updateItem()', () => {
    it('should update the item successfully', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) => cb(null));

        await expect(
            db.updateItem('test-uuid-1', USER_ID, { name: 'Updated', completed: true }),
        ).resolves.toBeUndefined();

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE todo_items'),
            ['Updated', 1, 'test-uuid-1', USER_ID],
            expect.any(Function),
        );
    });

    it('should reject if the query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Update error')),
        );

        await expect(
            db.updateItem('test-uuid-1', USER_ID, { name: 'Updated', completed: false }),
        ).rejects.toThrow('Update error');
    });
  });

  describe('removeItem()', () => {
    it('should return true when an item is deleted', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, { affectedRows: 1 }),
        );

        const result = await db.removeItem('test-uuid-1', USER_ID);
        expect(result).toBe(true);
    });

    it('should return false when no item was deleted', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, { affectedRows: 0 }),
        );

        const result = await db.removeItem('nonexistent', USER_ID);
        expect(result).toBe(false);
    });

    it('should reject if the query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Delete error')),
        );

        await expect(db.removeItem('test-uuid-1', USER_ID)).rejects.toThrow('Delete error');
    });
  });

  describe('createUser()', () => {
    const sampleUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hash',
      created_at: new Date('2024-01-01'),
    };

    it('should insert user successfully', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) => cb(null));

        await expect(db.createUser(sampleUser)).resolves.toBeUndefined();
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO users'),
            expect.any(Array),
            expect.any(Function),
        );
    });

    it('should reject if the query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Duplicate email')),
        );

        await expect(db.createUser(sampleUser)).rejects.toThrow('Duplicate email');
    });
  });

  describe('findUserByEmail()', () => {
    const mockUserRow = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hash',
      created_at: new Date('2024-01-01'),
    };

    it('should return user when found', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, [mockUserRow]),
        );

        const user = await db.findUserByEmail('test@example.com');
        expect(user).toBeDefined();
        expect(user?.email).toBe('test@example.com');
    });

    it('should return undefined when not found', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, []),
        );

        const user = await db.findUserByEmail('nobody@example.com');
        expect(user).toBeUndefined();
    });

    it('should reject if the query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Query error')),
        );

        await expect(db.findUserByEmail('test@example.com')).rejects.toThrow('Query error');
    });
  });

  describe('findUserById()', () => {
    const mockUserRow = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hash',
      created_at: new Date('2024-01-01'),
    };

    it('should return user when found', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, [mockUserRow]),
        );

        const user = await db.findUserById('user-1');
        expect(user).toBeDefined();
        expect(user?.id).toBe('user-1');
    });

    it('should return undefined when not found', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, []),
        );

        const user = await db.findUserById('nonexistent');
        expect(user).toBeUndefined();
    });

    it('should reject if the query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Query error')),
        );

        await expect(db.findUserById('user-1')).rejects.toThrow('Query error');
    });
  });

  describe('updateUser()', () => {
    it('should update user name', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) => cb(null));

        await expect(db.updateUser('user-1', { name: 'New Name' })).resolves.toBeUndefined();
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE users SET'),
            ['New Name', 'user-1'],
            expect.any(Function),
        );
    });

    it('should do nothing with empty fields', async (): Promise<void> => {
        await expect(db.updateUser('user-1', {})).resolves.toBeUndefined();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should update email and password together', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) => cb(null));

        await db.updateUser('user-1', { email: 'new@example.com', password: 'newhash' });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE users SET'),
            ['new@example.com', 'newhash', 'user-1'],
            expect.any(Function),
        );
    });

    it('should reject if the query fails', async (): Promise<void> => {
        mockQuery.mockImplementation((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Update error')),
        );

        await expect(db.updateUser('user-1', { name: 'Fail' })).rejects.toThrow('Update error');
    });
  });

  describe('deleteUser()', () => {
    it('should delete todos and user', async (): Promise<void> => {
        mockQuery
            .mockImplementationOnce((_sql: string, _params: unknown[], cb: Function) => cb(null))
            .mockImplementationOnce((_sql: string, _params: unknown[], cb: Function) => cb(null));

        await expect(db.deleteUser('user-1')).resolves.toBeUndefined();
    });

    it('should reject if deleting todos fails', async (): Promise<void> => {
        mockQuery.mockImplementationOnce((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Delete todos error')),
        );

        await expect(db.deleteUser('user-1')).rejects.toThrow('Delete todos error');
    });

    it('should reject if deleting user fails', async (): Promise<void> => {
        mockQuery
            .mockImplementationOnce((_sql: string, _params: unknown[], cb: Function) => cb(null))
            .mockImplementationOnce((_sql: string, _params: unknown[], cb: Function) =>
                cb(new Error('Delete user error')),
            );

        await expect(db.deleteUser('user-1')).rejects.toThrow('Delete user error');
    });
  });

  describe('getAllUserData()', () => {
    const mockUserRow = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hash',
      created_at: new Date('2024-01-01'),
    };

    it('should return user and todos', async (): Promise<void> => {
        mockQuery
            .mockImplementationOnce((_sql: string, _params: unknown[], cb: Function) =>
                cb(null, [mockUserRow]),
            )
            .mockImplementationOnce((_sql: string, _params: unknown[], cb: Function) =>
                cb(null, [mockRow]),
            );

        const data = await db.getAllUserData('user-1');
        expect(data.user.id).toBe('user-1');
        expect(data.todos).toHaveLength(1);
    });

    it('should throw if user not found', async (): Promise<void> => {
        mockQuery.mockImplementationOnce((_sql: string, _params: unknown[], cb: Function) =>
            cb(null, []),
        );

        await expect(db.getAllUserData('nonexistent')).rejects.toThrow('User not found');
    });

    it('should reject if user query fails', async (): Promise<void> => {
        mockQuery.mockImplementationOnce((_sql: string, _params: unknown[], cb: Function) =>
            cb(new Error('Query error')),
        );

        await expect(db.getAllUserData('user-1')).rejects.toThrow('Query error');
    });
  });
});

describe('readSecret()', () => {
  it('should throw if neither file path nor env variable is defined', async (): Promise<void> => {
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
