import type { Request, Response } from "express";
import db from "../persistence";
import type { TodoItem } from "../types/todo";

export default async function getItems(
  req: Request,
  res: Response<TodoItem[]>,
): Promise<void> {
  const userId = req.user!.sub;
  const items: TodoItem[] = await db.getItems(userId);
  res.status(200).json(items);
}
