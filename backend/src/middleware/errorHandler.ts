import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import logger from "../logger";

// Wraps async route handlers to forward errors to Express error middleware
export const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  ): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

// Custom error class for HTTP errors
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// Global error handler — must have 4 params for Express to recognize it
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => e.message).join(", ");
    res.status(400).json({ error: messages });
    return;
  }

  // Known HTTP errors → use their status code
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Unknown errors → 500
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
};
