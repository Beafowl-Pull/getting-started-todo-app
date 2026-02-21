import request from "supertest";

const mockTeardown = jest.fn();

jest.mock("../src/persistence", () => ({
  __esModule: true,
  default: {
    init: jest.fn().mockResolvedValue(undefined),
    teardown: mockTeardown,
    getItems: jest.fn().mockResolvedValue([]),
    getItem: jest.fn().mockResolvedValue(undefined),
    storeItem: jest.fn().mockResolvedValue(undefined),
    updateItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock("../src/routes/getGreeting", () =>
  jest.fn((_req: unknown, res: any) =>
    res.status(200).json({ greeting: "Hello world!" }),
  ),
);
jest.mock("../src/routes/getItems", () =>
  jest.fn((_req: unknown, res: any) => res.status(200).json([])),
);
jest.mock("../src/routes/addItem", () =>
  jest.fn((_req: unknown, res: any) => res.status(201).json({})),
);
jest.mock("../src/routes/updateItem", () =>
  jest.fn((_req: unknown, res: any) => res.status(200).json({})),
);
jest.mock("../src/routes/deleteItem", () =>
  jest.fn((_req: unknown, res: any) => res.sendStatus(204)),
);

import app, { gracefulShutdown } from "../src/index";

describe("src/index.ts", () => {
  describe("Routes", () => {
    it("GET /api/greeting should be registered", async () => {
      const res = await request(app).get("/api/greeting");
      expect(res.status).toBe(200);
    });

    it("GET /api/items should be registered", async () => {
      const res = await request(app).get("/api/items");
      expect(res.status).toBe(200);
    });

    it("POST /api/items should be registered", async () => {
      const res = await request(app).post("/api/items").send({ name: "Test" });
      expect(res.status).toBe(201);
    });

    it("PUT /api/items/:id should be registered", async () => {
      const res = await request(app)
        .put("/api/items/abc-123")
        .send({ name: "Updated" });
      expect(res.status).toBe(200);
    });

    it("DELETE /api/items/:id should be registered", async () => {
      const res = await request(app).delete("/api/items/abc-123");
      expect(res.status).toBe(204);
    });

    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/api/unknown");
      expect(res.status).toBe(404);
    });
  });

  describe("Middleware", () => {
  describe("Middleware", () => {
    it("should parse JSON bodies", async () => {
      const res = await request(app)
        .post("/api/items")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ name: "Test" }));
      expect(res.status).not.toBe(400);
    });

    it("should return 404 for unknown static files", async () => {
      const res = await request(app).get("/nonexistent.js");
      expect(res.status).toBe(404);
    });
  });

  describe("Graceful shutdown", () => {
    let mockExit: jest.SpyInstance;

    beforeEach(() => {
      mockExit = jest
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);
    });

    afterEach(() => {
      mockExit.mockRestore();
      mockTeardown.mockReset();
    });

    it("should call db.teardown and process.exit(0) on success", async () => {
      mockTeardown.mockResolvedValue(undefined);

      gracefulShutdown();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockTeardown).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should still call process.exit(0) even if teardown throws", async () => {
      mockTeardown.mockRejectedValue(new Error("Teardown failed"));

      gracefulShutdown();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
