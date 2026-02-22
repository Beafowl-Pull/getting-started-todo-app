import type { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../../persistence";
import { RegisterSchema } from "../../schemas/auth";
import { HttpError } from "../../middleware/errorHandler";
import { config } from "../../config";
import type { PublicUser } from "../../types/user";

const BCRYPT_COST = 12;

export default async function register(
  req: Request,
  res: Response<{ token: string; user: PublicUser }>,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, email, password } = RegisterSchema.parse(req.body);

    const existing = await db.findUserByEmail(email);
    if (existing) {
      throw new HttpError(409, "Email already in use");
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);
    const now = new Date();

    const user = {
      id: uuid(),
      name,
      email,
      password: hashedPassword,
      created_at: now,
    };

    await db.createUser(user);

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
      created_at: now.toISOString(),
    };

    res.status(201).json({ token, user: publicUser });
  } catch (err) {
    next(err);
  }
}
