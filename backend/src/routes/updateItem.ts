import type { Request, Response, NextFunction } from "express";
import db from "../persistence";
import type { TodoItem } from "../types/todo";
import { UpdateItemSchema } from "../schemas/todo";
import { HttpError } from "../middleware/errorHandler";

export default async function updateItem(
  req: Request,
  res: Response<TodoItem>,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params["id"] as string;
    const userId = req.user!.sub;
    const updates = UpdateItemSchema.parse(req.body);

    const existingItem = await db.getItem(id, userId);
    if (!existingItem) {
      throw new HttpError(404, `Item with id "${id}" not found`);
    }

    await db.updateItem(id, userId, {
      name: updates.name ?? existingItem.name,
      completed: updates.completed ?? existingItem.completed,
    });

    const updatedItem = (await db.getItem(id, userId)) as TodoItem;
    res.status(200).json(updatedItem);
  } catch (err) {
    next(err);
  }
}
