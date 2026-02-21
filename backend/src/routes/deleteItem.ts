import type { Request, Response, NextFunction } from "express";
import db from "../persistence";
import { HttpError } from "../middleware/errorHandler";

export default async function deleteItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params["id"] as string;
    const deleted = await db.removeItem(id);

    if (!deleted) {
      throw new HttpError(404, `Item with id "${id}" not found`);
    }

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
