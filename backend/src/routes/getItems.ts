import type { Request, Response } from "express";
import db from "../persistence";
import type { TodoItem } from "../types/todo";

export default async function getItems(
  _req: Request,
  res: Response<TodoItem[]>,
): Promise<void> {
  const items: TodoItem[] = await db.getItems();
  res.status(200).json(items);
}
