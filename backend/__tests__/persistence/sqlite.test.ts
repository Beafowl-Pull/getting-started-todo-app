import { TodoItem } from "../../src/types/todo";
import fs from "fs";
import path from "path";

// Use in-memory SQLite for the main suite
process.env.SQLITE_DB_LOCATION = ":memory:";
process.env.NODE_ENV = "test";

import db from "../../src/persistence/sqlite";

const sampleItem: TodoItem = {
  id: "test-uuid-1",
  name: "Test todo",
  completed: false,
};

describe("SQLite persistence", () => {
  beforeAll(async () => {
    await db.init();
  });

  afterAll(async () => {
    await db.teardown();
  });

  beforeEach(async () => {
    const items = await db.getItems();
    for (const item of items) {
      await db.removeItem(item.id);
    }
  });

  // --- init ---
  describe("init()", () => {
    it("should create the directory if it does not exist", async () => {
      const tmpDir = path.join("/tmp", `todo-test-${Date.now()}`);
      const tmpDb = path.join(tmpDir, "todo.db");

      // Ensure dir doesn't exist
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });

      process.env.SQLITE_DB_LOCATION = tmpDb;

      // Re-import the module fresh to pick up new env var
      jest.resetModules();
      const freshDb = (await import("../../src/persistence/sqlite")).default;
      await freshDb.init();

      expect(fs.existsSync(tmpDir)).toBe(true);

      await freshDb.teardown();
      fs.rmSync(tmpDir, { recursive: true });

      // Restore
      process.env.SQLITE_DB_LOCATION = ":memory:";
      jest.resetModules();
    });

    it("should log when NODE_ENV is not test", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      process.env.SQLITE_DB_LOCATION = ":memory:";

      jest.resetModules();
      const freshDb = (await import("../../src/persistence/sqlite")).default;
      await freshDb.init();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Using SQLite database"),
      );

      await freshDb.teardown();
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
      jest.resetModules();
    });
  });

  // --- getItems ---
  describe("getItems()", () => {
    it("should return an empty array when no items exist", async () => {
      const items = await db.getItems();
      expect(items).toEqual([]);
    });

    it("should return all stored items", async () => {
      await db.storeItem(sampleItem);
      await db.storeItem({
        id: "test-uuid-2",
        name: "Second todo",
        completed: true,
      });

      const items = await db.getItems();
      expect(items).toHaveLength(2);
    });
  });

  // --- getItem ---
  describe("getItem()", () => {
    it("should return the correct item by id", async () => {
      await db.storeItem(sampleItem);

      const item = await db.getItem(sampleItem.id);
      expect(item).toEqual(sampleItem);
    });

    it("should return undefined if item does not exist", async () => {
      const item = await db.getItem("nonexistent-id");
      expect(item).toBeUndefined();
    });
  });

  // --- storeItem ---
  describe("storeItem()", () => {
    it("should store a new item and retrieve it", async () => {
      await db.storeItem(sampleItem);

      const item = await db.getItem(sampleItem.id);
      expect(item).toEqual(sampleItem);
    });

    it("should correctly store completed=true as boolean", async () => {
      const completedItem: TodoItem = { ...sampleItem, completed: true };
      await db.storeItem(completedItem);

      const item = await db.getItem(completedItem.id);
      expect(item?.completed).toBe(true);
    });

    it("should correctly store completed=false as boolean", async () => {
      await db.storeItem(sampleItem);

      const item = await db.getItem(sampleItem.id);
      expect(item?.completed).toBe(false);
    });
  });

  // --- updateItem ---
  describe("updateItem()", () => {
    it("should update the name of an existing item", async () => {
      await db.storeItem(sampleItem);
      await db.updateItem(sampleItem.id, {
        name: "Updated name",
        completed: false,
      });

      const item = await db.getItem(sampleItem.id);
      expect(item?.name).toBe("Updated name");
    });

    it("should update the completed status of an existing item", async () => {
      await db.storeItem(sampleItem);
      await db.updateItem(sampleItem.id, {
        name: sampleItem.name,
        completed: true,
      });

      const item = await db.getItem(sampleItem.id);
      expect(item?.completed).toBe(true);
    });
  });

  // --- removeItem ---
  describe("removeItem()", () => {
    it("should delete an existing item and return true", async () => {
      await db.storeItem(sampleItem);

      const result = await db.removeItem(sampleItem.id);
      expect(result).toBe(true);

      const item = await db.getItem(sampleItem.id);
      expect(item).toBeUndefined();
    });

    it("should return false when trying to delete a non-existent item", async () => {
      const result = await db.removeItem("nonexistent-id");
      expect(result).toBe(false);
    });
  });
});
