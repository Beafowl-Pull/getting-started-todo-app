import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import db from "../../persistence";
import { HttpError } from "../../middleware/errorHandler";
import { z } from "zod";

const DeleteMeSchema = z.object({
  password: z.string({ required_error: 'Field "password" is required' }),
});

export default async function deleteMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { password } = DeleteMeSchema.parse(req.body);

    const user = await db.findUserById(userId);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new HttpError(403, "Password is incorrect");
    }

    await db.deleteUser(userId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
