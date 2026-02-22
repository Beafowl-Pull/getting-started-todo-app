import type { Application } from "express";
import express from "express";
import path from "path";
import db from "./persistence";
import { config, validateConfig } from "./config";
import logger from "./logger";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/authenticate";
import getGreeting from "./routes/getGreeting";
import getItems from "./routes/getItems";
import addItem from "./routes/addItem";
import updateItem from "./routes/updateItem";
import deleteItem from "./routes/deleteItem";
import register from "./routes/auth/register";
import login from "./routes/auth/login";
import getMe from "./routes/me/getMe";
import updateMe from "./routes/me/updateMe";
import exportMe from "./routes/me/exportMe";
import deleteMe from "./routes/me/deleteMe";

const app: Application = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "static")));

app.get("/api/greeting", getGreeting);

// Auth routes (public)
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);

// Protected routes
app.get("/api/me", authenticate, getMe);
app.patch("/api/me", authenticate, updateMe);
app.get("/api/me/export", authenticate, exportMe);
app.delete("/api/me", authenticate, deleteMe);

app.get("/api/items", authenticate, getItems);
app.post("/api/items", authenticate, addItem);
app.put("/api/items/:id", authenticate, updateItem);
app.delete("/api/items/:id", authenticate, deleteItem);

app.use(errorHandler);

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
