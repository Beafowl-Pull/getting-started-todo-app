import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import db from "../../persistence";
import { UpdateMeSchema } from "../../schemas/auth";
import { HttpError } from "../../middleware/errorHandler";
import type { PublicUser } from "../../types/user";

const BCRYPT_COST = 12;

export default async function updateMe(
  req: Request,
  res: Response<PublicUser>,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const updates = UpdateMeSchema.parse(req.body);

    const user = await db.findUserById(userId);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const fields: Partial<{ name: string; email: string; password: string }> =
      {};

    if (updates.name !== undefined) {
      fields.name = updates.name;
    }

    if (updates.email !== undefined || updates.newPassword !== undefined) {
      const isValid = await bcrypt.compare(
        updates.currentPassword!,
        user.password,
      );
      if (!isValid) {
        throw new HttpError(403, "Current password is incorrect");
      }

      if (updates.email !== undefined) {
        fields.email = updates.email;
      }

      if (updates.newPassword !== undefined) {
        fields.password = await bcrypt.hash(updates.newPassword, BCRYPT_COST);
      }
    }

    await db.updateUser(userId, fields);

    const updated = await db.findUserById(userId);
    if (!updated) {
      throw new HttpError(404, "User not found");
    }

    const publicUser: PublicUser = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      created_at: updated.created_at.toISOString(),
    };

    res.status(200).json(publicUser);
  } catch (err) {
    next(err);
  }
}
