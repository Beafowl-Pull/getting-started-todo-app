import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { TodoItem } from "../types/todo";
import type { User, PublicUser } from "../types/user";
import logger from "../logger";

const DB_LOCATION = process.env["SQLITE_DB_LOCATION"] ?? "/etc/todos/todo.db";

interface SQLiteTodoRow {
  id: string;
  name: string;
  completed: number;
  user_id: string;
}

interface SQLiteUserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  created_at: number; // unix timestamp (seconds)
}

let db: Database.Database;

const rowToTodoItem = (row: SQLiteTodoRow): TodoItem => ({
  id: row.id,
  name: row.name,
  completed: row.completed === 1,
  user_id: row.user_id,
});

const rowToUser = (row: SQLiteUserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  password: row.password,
  created_at: new Date(row.created_at * 1000),
});

const userToPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  created_at: user.created_at.toISOString(),
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
    "CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean, user_id varchar(36))",
  );

  // Migration: add user_id column if it doesn't exist
  const columns = db.pragma("table_info(todo_items)") as Array<{ name: string }>;
  const hasUserId = columns.some((col) => col.name === "user_id");
  if (!hasUserId) {
    db.exec("ALTER TABLE todo_items ADD COLUMN user_id VARCHAR(36)");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         VARCHAR(36)  NOT NULL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      email      VARCHAR(255) NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      created_at INTEGER      NOT NULL
    )
  `);

  if (process.env["NODE_ENV"] !== "test") {
    logger.info(`Using SQLite database at ${DB_LOCATION}`);
  }

  return Promise.resolve();
};

const teardown = (): Promise<void> => {
  db.close();
  return Promise.resolve();
};

// ---- Todo methods (scoped by userId) ----

const getItems = (userId: string): Promise<TodoItem[]> => {
  const rows = db
    .prepare("SELECT * FROM todo_items WHERE user_id = ?")
    .all(userId) as SQLiteTodoRow[];
  return Promise.resolve(rows.map(rowToTodoItem));
};

const getItem = (id: string, userId: string): Promise<TodoItem | undefined> => {
  const row = db
    .prepare("SELECT * FROM todo_items WHERE id = ? AND user_id = ?")
    .get(id, userId) as SQLiteTodoRow | undefined;
  return Promise.resolve(row ? rowToTodoItem(row) : undefined);
};

const storeItem = (item: TodoItem): Promise<void> => {
  db.prepare(
    "INSERT INTO todo_items (id, name, completed, user_id) VALUES (?, ?, ?, ?)",
  ).run(item.id, item.name, item.completed ? 1 : 0, item.user_id);
  return Promise.resolve();
};

const updateItem = (
  id: string,
  userId: string,
  item: Pick<TodoItem, "name" | "completed">,
): Promise<void> => {
  db.prepare(
    "UPDATE todo_items SET name = ?, completed = ? WHERE id = ? AND user_id = ?",
  ).run(item.name, item.completed ? 1 : 0, id, userId);
  return Promise.resolve();
};

const removeItem = (id: string, userId: string): Promise<boolean> => {
  const result = db
    .prepare("DELETE FROM todo_items WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return Promise.resolve(result.changes > 0);
};

// ---- User methods ----

const createUser = (user: User): Promise<void> => {
  try {
    db.prepare(
      "INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(
      user.id,
      user.name,
      user.email,
      user.password,
      Math.floor(user.created_at.getTime() / 1000),
    );
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err as Error);
  }
};

const findUserByEmail = (email: string): Promise<User | undefined> => {
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as SQLiteUserRow | undefined;
  return Promise.resolve(row ? rowToUser(row) : undefined);
};

const findUserById = (id: string): Promise<User | undefined> => {
  const row = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as SQLiteUserRow | undefined;
  return Promise.resolve(row ? rowToUser(row) : undefined);
};

const updateUser = (
  id: string,
  fields: Partial<Pick<User, "name" | "email" | "password">>,
): Promise<void> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (fields.name !== undefined) {
    setClauses.push("name = ?");
    values.push(fields.name);
  }
  if (fields.email !== undefined) {
    setClauses.push("email = ?");
    values.push(fields.email);
  }
  if (fields.password !== undefined) {
    setClauses.push("password = ?");
    values.push(fields.password);
  }

  if (setClauses.length === 0) return Promise.resolve();

  values.push(id);
  db.prepare(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`).run(
    ...values,
  );
  return Promise.resolve();
};

const deleteUser = (id: string): Promise<void> => {
  db.prepare("DELETE FROM todo_items WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return Promise.resolve();
};

const getAllUserData = async (
  userId: string,
): Promise<{ user: PublicUser; todos: TodoItem[] }> => {
  const userRow = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as SQLiteUserRow | undefined;

  if (!userRow) {
    throw new Error(`User not found: ${userId}`);
  }

  const user = userToPublicUser(rowToUser(userRow));
  const todos = await getItems(userId);

  return { user, todos };
};

export default {
  init,
  teardown,
  getItems,
  getItem,
  storeItem,
  updateItem,
  removeItem,
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  deleteUser,
  getAllUserData,
};
