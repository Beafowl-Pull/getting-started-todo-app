import type { Request, Response } from "express";

const GREETING = "Hello world!" as const;

interface GreetingResponse {
  greeting: typeof GREETING;
}

export default function getGreeting(
  _req: Request,
  res: Response<GreetingResponse>,
): void {
  res.status(200).json({ greeting: GREETING });
}
