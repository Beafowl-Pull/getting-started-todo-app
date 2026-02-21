import type { TodoItem } from "../types/todo";
import mysql from "./mysql";
import sqlite from "./sqlite";

export interface DbAdapter {
  init: () => Promise<void>;
  teardown: () => Promise<void>;
  getItems: () => Promise<TodoItem[]>;
  getItem: (id: string) => Promise<TodoItem | undefined>;
  storeItem: (item: TodoItem) => Promise<void>;
  updateItem: (
    id: string,
    item: Pick<TodoItem, "name" | "completed">,
  ) => Promise<void>;
  removeItem: (id: string) => Promise<boolean>;
}

const adapter: DbAdapter = process.env.MYSQL_HOST ? mysql : sqlite;

export default adapter;
