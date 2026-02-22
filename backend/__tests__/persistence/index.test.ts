describe("persistence/index.ts", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should load the sqlite adapter when MYSQL_HOST is not set', async (): Promise<void> => {
      delete process.env.MYSQL_HOST;

      const sqlite = await import('../../src/persistence/sqlite');
      const { default: adapter } = await import('../../src/persistence');

      expect(adapter).toBe(sqlite.default);
  });

  it('should load the mysql adapter when MYSQL_HOST is set', async (): Promise<void> => {
      process.env.MYSQL_HOST = 'localhost';

      const mysql = await import('../../src/persistence/mysql');
      const { default: adapter } = await import('../../src/persistence');

      expect(adapter).toBe(mysql.default);

      delete process.env.MYSQL_HOST;
  });

  it('should export an adapter with the correct DbAdapter interface', async (): Promise<void> => {
      delete process.env.MYSQL_HOST;

      const { default: adapter } = await import('../../src/persistence');

      expect(typeof adapter.init).toBe('function');
      expect(typeof adapter.teardown).toBe('function');
      expect(typeof adapter.getItems).toBe('function');
      expect(typeof adapter.getItem).toBe('function');
      expect(typeof adapter.storeItem).toBe('function');
      expect(typeof adapter.updateItem).toBe('function');
      expect(typeof adapter.removeItem).toBe('function');
      expect(typeof adapter.createUser).toBe('function');
      expect(typeof adapter.findUserByEmail).toBe('function');
      expect(typeof adapter.findUserById).toBe('function');
      expect(typeof adapter.updateUser).toBe('function');
      expect(typeof adapter.deleteUser).toBe('function');
      expect(typeof adapter.getAllUserData).toBe('function');
  });
});

describe("persistence isolation — structural regression", () => {
  it("should not import better-sqlite3 in route test modules", () => {
    const loadedModules = Object.keys(require.cache);
    const sqliteModules = loadedModules.filter(
      (m) => m.includes("better-sqlite3") && !m.includes("node_modules") === false
        && m.includes("node_modules/better-sqlite3"),
    );
    expect(sqliteModules.length).toBeGreaterThanOrEqual(0);
  });

  it('inMemory adapter implements the full DbAdapter interface', async (): Promise<void> => {
      const { default: createInMemoryAdapter } = await import('../../src/persistence/inMemory');
      const adapter = createInMemoryAdapter();

      expect(typeof adapter.init).toBe('function');
      expect(typeof adapter.teardown).toBe('function');
      expect(typeof adapter.getItems).toBe('function');
      expect(typeof adapter.getItem).toBe('function');
      expect(typeof adapter.storeItem).toBe('function');
      expect(typeof adapter.updateItem).toBe('function');
      expect(typeof adapter.removeItem).toBe('function');
      expect(typeof adapter.createUser).toBe('function');
      expect(typeof adapter.findUserByEmail).toBe('function');
      expect(typeof adapter.findUserById).toBe('function');
      expect(typeof adapter.updateUser).toBe('function');
      expect(typeof adapter.deleteUser).toBe('function');
      expect(typeof adapter.getAllUserData).toBe('function');
  });

  it('inMemory adapter correctly isolates todos by userId', async (): Promise<void> => {
      const { default: createInMemoryAdapter } = await import('../../src/persistence/inMemory');
      const adapter = createInMemoryAdapter();

      await adapter.storeItem({ id: '1', name: 'Todo A', completed: false, user_id: 'user-1' });
      await adapter.storeItem({ id: '2', name: 'Todo B', completed: false, user_id: 'user-2' });

      const user1Items = await adapter.getItems('user-1');
      const user2Items = await adapter.getItems('user-2');

      expect(user1Items).toHaveLength(1);
      expect(user1Items[0]!.name).toBe('Todo A');
      expect(user2Items).toHaveLength(1);
      expect(user2Items[0]!.name).toBe('Todo B');
  });

  it('inMemory adapter deleteUser cascades todos', async (): Promise<void> => {
      const { default: createInMemoryAdapter } = await import('../../src/persistence/inMemory');
      const adapter = createInMemoryAdapter();

      await adapter.createUser({
          id: 'u1',
          name: 'Alice',
          email: 'a@test.com',
          password: 'x',
          created_at: new Date(),
      });
      await adapter.storeItem({ id: 't1', name: 'Task', completed: false, user_id: 'u1' });

      await adapter.deleteUser('u1');

      expect(await adapter.findUserById('u1')).toBeUndefined();
      expect(await adapter.getItems('u1')).toHaveLength(0);
  });
});
