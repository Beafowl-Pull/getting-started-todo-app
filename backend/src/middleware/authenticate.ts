import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types/user";
import { config } from "../config";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice(7);
  const secret = config.jwt.secret;

  if (!secret) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload & {
      sub: string;
      email: string;
    };
    req.user = { sub: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
