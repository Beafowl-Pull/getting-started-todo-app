import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../../persistence";
import { LoginSchema } from "../../schemas/auth";
import { HttpError } from "../../middleware/errorHandler";
import { config } from "../../config";
import type { PublicUser } from "../../types/user";

// Dummy hash to prevent timing oracle when user doesn't exist
const DUMMY_HASH =
  "$2b$12$invalidhashvaluethatisusedtopreventimingoracle00000000000";

export default async function login(
  req: Request,
  res: Response<{ token: string; user: PublicUser }>,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await db.findUserByEmail(email);

    const hashToCompare = user ? user.password : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid) {
      throw new HttpError(401, "Invalid credentials");
    }

    const secret = config.jwt.secret!;
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions,
    );

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at.toISOString(),
    };

    res.status(200).json({ token, user: publicUser });
  } catch (err) {
    next(err);
  }
}
