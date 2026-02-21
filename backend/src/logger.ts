import pino from "pino";
import { config } from "./config";

const logger = pino({
  level: config.nodeEnv === "test" ? "silent" : "info",
  transport:
    config.nodeEnv === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

export default logger;
