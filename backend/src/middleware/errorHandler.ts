import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import logger from "../logger";

export const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  ): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => e.message).join(", ");
    res.status(400).json({ error: messages });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
};
