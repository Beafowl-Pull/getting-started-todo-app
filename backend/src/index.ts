import type { Application } from "express";
import express from "express";
import path from "path";
import db from "./persistence";
import { config, validateConfig } from "./config";
import logger from "./logger";
import { errorHandler } from "./middleware/errorHandler";
import getGreeting from "./routes/getGreeting";
import getItems from "./routes/getItems";
import addItem from "./routes/addItem";
import updateItem from "./routes/updateItem";
import deleteItem from "./routes/deleteItem";

const app: Application = express();

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, "static")));

// Routes
app.get("/api/greeting", getGreeting);
app.get("/api/items", getItems);
app.post("/api/items", addItem);
app.put("/api/items/:id", updateItem);
app.delete("/api/items/:id", deleteItem);

// Global error handler — must be registered after routes
app.use(errorHandler);

// Exported for testing
export const gracefulShutdown = (): void => {
  db.teardown()
    .catch(() => {
      // Ignore teardown errors during shutdown
    })
    .finally(() => {
      process.exit(0);
    });
};

const signalHandler = (): void => gracefulShutdown();
process.on("SIGINT", signalHandler);
process.on("SIGTERM", signalHandler);
process.on("SIGUSR2", signalHandler);

/* istanbul ignore next */
if (require.main === module) {
  const startServer = async (): Promise<void> => {
    try {
      validateConfig();
      await db.init();
      app.listen(config.port, () => {
        logger.info(`Server listening on port ${config.port}`);
      });
    } catch (err) {
      logger.error({ err }, "Failed to start server");
      process.exit(1);
    }
  };

  void startServer();
}

export default app;
