import type { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import db from "../persistence";
import type { TodoItem } from "../types/todo";
import { AddItemSchema } from "../schemas/todo";

export default async function addItem(
  req: Request,
  res: Response<TodoItem>,
  next: NextFunction,
): Promise<void> {
  try {
    const { name } = AddItemSchema.parse(req.body);
    const userId = req.user!.sub;

    const item: TodoItem = {
      id: uuid(),
      name,
      completed: false,
      user_id: userId,
    };

    await db.storeItem(item);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}
