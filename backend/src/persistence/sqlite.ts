import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { TodoItem } from "../types/todo";
import logger from "../logger";

const DB_LOCATION = process.env["SQLITE_DB_LOCATION"] ?? "/etc/todos/todo.db";

interface SQLiteTodoRow {
  id: string;
  name: string;
  completed: number;
}

let db: Database.Database;

const rowToTodoItem = (row: SQLiteTodoRow): TodoItem => ({
  id: row.id,
  name: row.name,
  completed: row.completed === 1,
});

const init = (): Promise<void> => {
  const isMemory = DB_LOCATION === ":memory:";

  if (!isMemory) {
    const dirName = path.dirname(DB_LOCATION);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
  }

  db = new Database(DB_LOCATION);
  db.exec(
    "CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)",
  );

  if (process.env["NODE_ENV"] !== "test") {
    logger.info(`Using SQLite database at ${DB_LOCATION}`);
  }

  return Promise.resolve();
};

const teardown = (): Promise<void> => {
  db.close();
  return Promise.resolve();
};

const getItems = (): Promise<TodoItem[]> => {
  const rows = db.prepare("SELECT * FROM todo_items").all() as SQLiteTodoRow[];
  return Promise.resolve(rows.map(rowToTodoItem));
};

const getItem = (id: string): Promise<TodoItem | undefined> => {
  const row = db.prepare("SELECT * FROM todo_items WHERE id = ?").get(id) as
    | SQLiteTodoRow
    | undefined;
  return Promise.resolve(row ? rowToTodoItem(row) : undefined);
};

const storeItem = (item: TodoItem): Promise<void> => {
  db.prepare(
    "INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)",
  ).run(item.id, item.name, item.completed ? 1 : 0);
  return Promise.resolve();
};

const updateItem = (
  id: string,
  item: Pick<TodoItem, "name" | "completed">,
): Promise<void> => {
  db.prepare("UPDATE todo_items SET name = ?, completed = ? WHERE id = ?").run(
    item.name,
    item.completed ? 1 : 0,
    id,
  );
  return Promise.resolve();
};

const removeItem = (id: string): Promise<boolean> => {
  const result = db.prepare("DELETE FROM todo_items WHERE id = ?").run(id);
  return Promise.resolve(result.changes > 0);
};

export default {
  init,
  teardown,
  getItems,
  getItem,
  storeItem,
  updateItem,
  removeItem,
};
