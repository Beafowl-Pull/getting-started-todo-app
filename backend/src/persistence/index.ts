import type { TodoItem } from "../types/todo";
import type { User, PublicUser } from "../types/user";
import mysql from "./mysql";
import sqlite from "./sqlite";

export interface DbAdapter {
  init: () => Promise<void>;
  teardown: () => Promise<void>;

  getItems: (userId: string) => Promise<TodoItem[]>;
  getItem: (id: string, userId: string) => Promise<TodoItem | undefined>;
  storeItem: (item: TodoItem) => Promise<void>;
  updateItem: (
    id: string,
    userId: string,
    item: Pick<TodoItem, "name" | "completed">,
  ) => Promise<void>;
  removeItem: (id: string, userId: string) => Promise<boolean>;

  createUser: (user: User) => Promise<void>;
  findUserByEmail: (email: string) => Promise<User | undefined>;
  findUserById: (id: string) => Promise<User | undefined>;
  updateUser: (
    id: string,
    fields: Partial<Pick<User, "name" | "email" | "password">>,
  ) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  getAllUserData: (
    userId: string,
  ) => Promise<{ user: PublicUser; todos: TodoItem[] }>;
}

const adapter: DbAdapter = process.env.MYSQL_HOST ? mysql : sqlite;

export default adapter;
