import type { Request, Response, NextFunction } from "express";
import db from "../../persistence";
import { HttpError } from "../../middleware/errorHandler";
import type { PublicUser } from "../../types/user";

export default async function getMe(
  req: Request,
  res: Response<PublicUser>,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const user = await db.findUserById(userId);

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at.toISOString(),
    };

    res.status(200).json(publicUser);
  } catch (err) {
    next(err);
  }
}
