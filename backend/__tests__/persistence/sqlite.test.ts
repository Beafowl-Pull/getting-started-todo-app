import { TodoItem } from '../../src/types/todo';
import { User } from '../../src/types/user';
import fs from 'fs';
import path from 'path';

process.env['SQLITE_DB_LOCATION'] = ':memory:';
process.env['NODE_ENV'] = 'test';

import db from '../../src/persistence/sqlite';

const USER_ID = 'user-uuid-1';
const OTHER_USER_ID = 'user-uuid-2';

const sampleItem: TodoItem = {
  id: 'test-uuid-1',
  name: 'Test todo',
  completed: false,
  user_id: USER_ID,
};

const sampleUser: User = {
  id: USER_ID,
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedpassword',
  created_at: new Date('2024-01-01T00:00:00.000Z'),
};

describe('SQLite persistence', () => {
  beforeAll(async () => {
    await db.init();
  });

  afterAll(async () => {
    await db.teardown();
  });

  beforeEach(async () => {
    const items = await db.getItems(USER_ID);
    for (const item of items) {
      await db.removeItem(item.id, USER_ID);
    }
    const otherItems = await db.getItems(OTHER_USER_ID);
    for (const item of otherItems) {
      await db.removeItem(item.id, OTHER_USER_ID);
    }
    // Clean up users: try by ID first, then by known emails as fallback
    const user = await db.findUserById(USER_ID);
    if (user) await db.deleteUser(user.id);
    const user2 = await db.findUserById(OTHER_USER_ID);
    if (user2) await db.deleteUser(user2.id);
    // Also clean up by email in case IDs differ (e.g., after email change tests)
    const byEmail1 = await db.findUserByEmail('test@example.com');
    if (byEmail1) await db.deleteUser(byEmail1.id);
    const byEmail2 = await db.findUserByEmail('new@example.com');
    if (byEmail2) await db.deleteUser(byEmail2.id);
  });

  describe('init()', () => {
    it('should create the directory if it does not exist', async () => {
      const tmpDir = path.join('/tmp', `todo-test-${Date.now()}`);
      const tmpDb = path.join(tmpDir, 'todo.db');

      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });

      process.env['SQLITE_DB_LOCATION'] = tmpDb;

      jest.resetModules();
      const freshDb = (await import('../../src/persistence/sqlite')).default;
      await freshDb.init();

      expect(fs.existsSync(tmpDir)).toBe(true);

      await freshDb.teardown();
      fs.rmSync(tmpDir, { recursive: true });

      process.env['SQLITE_DB_LOCATION'] = ':memory:';
      jest.resetModules();
    });

    it('should log when NODE_ENV is not test', async () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';
      process.env['SQLITE_DB_LOCATION'] = ':memory:';

      jest.resetModules();

      jest.mock('../../src/logger', () => ({ info: jest.fn(), error: jest.fn() }));
      const freshDb = (await import('../../src/persistence/sqlite')).default;
      const logger = (await import('../../src/logger')).default;

      await freshDb.init();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Using SQLite database'));

      await freshDb.teardown();
      process.env['NODE_ENV'] = originalEnv;
      jest.resetModules();
    });
  });

  describe('getItems()', () => {
    it('should return an empty array when no items exist for the user', async () => {
      const items = await db.getItems(USER_ID);
      expect(items).toEqual([]);
    });

    it('should return only items belonging to the user', async () => {
      await db.storeItem(sampleItem);
      await db.storeItem({ id: 'other-uuid', name: 'Other user todo', completed: false, user_id: OTHER_USER_ID });

      const items = await db.getItems(USER_ID);
      expect(items).toHaveLength(1);
      expect(items[0]!.id).toBe(sampleItem.id);
    });

    it('should return all stored items for the user', async () => {
      await db.storeItem(sampleItem);
      await db.storeItem({ id: 'test-uuid-2', name: 'Second todo', completed: true, user_id: USER_ID });

      const items = await db.getItems(USER_ID);
      expect(items).toHaveLength(2);
    });
  });

  describe('getItem()', () => {
    it('should return the correct item by id and userId', async () => {
      await db.storeItem(sampleItem);

      const item = await db.getItem(sampleItem.id, USER_ID);
      expect(item).toMatchObject({ id: sampleItem.id, name: sampleItem.name });
    });

    it('should return undefined if item belongs to another user', async () => {
      await db.storeItem(sampleItem);

      const item = await db.getItem(sampleItem.id, OTHER_USER_ID);
      expect(item).toBeUndefined();
    });

    it('should return undefined if item does not exist', async () => {
      const item = await db.getItem('nonexistent-id', USER_ID);
      expect(item).toBeUndefined();
    });
  });

  describe('storeItem()', () => {
    it('should store a new item and retrieve it', async () => {
      await db.storeItem(sampleItem);

      const item = await db.getItem(sampleItem.id, USER_ID);
      expect(item).toMatchObject({ id: sampleItem.id, name: sampleItem.name, completed: false });
    });

    it('should correctly store completed=true as boolean', async () => {
      const completedItem: TodoItem = { ...sampleItem, completed: true };
      await db.storeItem(completedItem);

      const item = await db.getItem(completedItem.id, USER_ID);
      expect(item?.completed).toBe(true);
    });

    it('should correctly store completed=false as boolean', async () => {
      await db.storeItem(sampleItem);

      const item = await db.getItem(sampleItem.id, USER_ID);
      expect(item?.completed).toBe(false);
    });
  });

  describe('updateItem()', () => {
    it('should update the name of an existing item', async () => {
      await db.storeItem(sampleItem);
      await db.updateItem(sampleItem.id, USER_ID, { name: 'Updated name', completed: false });

      const item = await db.getItem(sampleItem.id, USER_ID);
      expect(item?.name).toBe('Updated name');
    });

    it('should update the completed status of an existing item', async () => {
      await db.storeItem(sampleItem);
      await db.updateItem(sampleItem.id, USER_ID, { name: sampleItem.name, completed: true });

      const item = await db.getItem(sampleItem.id, USER_ID);
      expect(item?.completed).toBe(true);
    });

    it('should not update item belonging to another user', async () => {
      await db.storeItem(sampleItem);
      await db.updateItem(sampleItem.id, OTHER_USER_ID, { name: 'Hacked', completed: true });

      const item = await db.getItem(sampleItem.id, USER_ID);
      expect(item?.name).toBe(sampleItem.name);
    });
  });

  describe('removeItem()', () => {
    it('should delete an existing item and return true', async () => {
      await db.storeItem(sampleItem);

      const result = await db.removeItem(sampleItem.id, USER_ID);
      expect(result).toBe(true);

      const item = await db.getItem(sampleItem.id, USER_ID);
      expect(item).toBeUndefined();
    });

    it('should return false when trying to delete a non-existent item', async () => {
      const result = await db.removeItem('nonexistent-id', USER_ID);
      expect(result).toBe(false);
    });

    it("should return false when trying to delete another user's item", async () => {
      await db.storeItem(sampleItem);

      const result = await db.removeItem(sampleItem.id, OTHER_USER_ID);
      expect(result).toBe(false);

      const item = await db.getItem(sampleItem.id, USER_ID);
      expect(item).toBeDefined();
    });
  });

  describe('User methods', () => {
    describe('createUser()', () => {
      it('should create a user and retrieve by email', async () => {
        await db.createUser(sampleUser);

        const found = await db.findUserByEmail(sampleUser.email);
        expect(found).toBeDefined();
        expect(found?.id).toBe(sampleUser.id);
        expect(found?.name).toBe(sampleUser.name);
        expect(found?.email).toBe(sampleUser.email);
      });

      it('should throw on duplicate email', async () => {
        await db.createUser(sampleUser);
        await expect(db.createUser({ ...sampleUser, id: 'other-id' })).rejects.toThrow();
      });
    });

    describe('findUserById()', () => {
      it('should return user by id', async () => {
        await db.createUser(sampleUser);

        const found = await db.findUserById(sampleUser.id);
        expect(found?.id).toBe(sampleUser.id);
      });

      it('should return undefined for non-existent id', async () => {
        const found = await db.findUserById('nonexistent');
        expect(found).toBeUndefined();
      });
    });

    describe('updateUser()', () => {
      it('should update user name', async () => {
        await db.createUser(sampleUser);
        await db.updateUser(sampleUser.id, { name: 'Updated Name' });

        const found = await db.findUserById(sampleUser.id);
        expect(found?.name).toBe('Updated Name');
      });

      it('should update user email', async () => {
        await db.createUser(sampleUser);
        await db.updateUser(sampleUser.id, { email: 'new@example.com' });

        const found = await db.findUserById(sampleUser.id);
        expect(found?.email).toBe('new@example.com');
      });

      it('should do nothing with empty fields', async () => {
        await db.createUser(sampleUser);
        await db.updateUser(sampleUser.id, {});

        const found = await db.findUserById(sampleUser.id);
        expect(found?.name).toBe(sampleUser.name);
      });
    });

    describe('deleteUser()', () => {
      it('should delete user and cascade todos', async () => {
        await db.createUser(sampleUser);
        await db.storeItem(sampleItem);

        await db.deleteUser(sampleUser.id);

        const found = await db.findUserById(sampleUser.id);
        expect(found).toBeUndefined();

        const items = await db.getItems(USER_ID);
        expect(items).toHaveLength(0);
      });
    });

    describe('getAllUserData()', () => {
      it('should return user and todos', async () => {
        await db.createUser(sampleUser);
        await db.storeItem(sampleItem);

        const data = await db.getAllUserData(USER_ID);
        expect(data.user.id).toBe(USER_ID);
        expect(data.todos).toHaveLength(1);
      });

      it('should throw if user does not exist', async () => {
        await expect(db.getAllUserData('nonexistent')).rejects.toThrow();
      });
    });
  });
});
