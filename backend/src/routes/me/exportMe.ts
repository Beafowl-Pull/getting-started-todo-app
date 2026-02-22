import type { Request, Response, NextFunction } from "express";
import db from "../../persistence";

export default async function exportMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { user, todos } = await db.getAllUserData(userId);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      todos,
    };

    res.status(200).json(exportData);
  } catch (err) {
    next(err);
  }
}
