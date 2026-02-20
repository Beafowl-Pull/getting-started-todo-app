import request from "supertest";
import express, { Application } from "express";
import addItem from "../../src/routes/addItem";
import { errorHandler } from "../../src/middleware/errorHandler";
import db from "../../src/persistence";
import { sampleTodo } from "../fixtures/todo";

jest.mock("../../src/persistence");
jest.mock("uuid", () => ({ v4: () => "mock-uuid-1234" }));

const mockDb = db as jest.Mocked<typeof db>;

const app: Application = express();
app.use(express.json());
app.post("/api/items", addItem);
app.use(errorHandler); // ← branché ici pour intercepter les erreurs Zod

describe("POST /api/items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.storeItem.mockResolvedValue();
  });

  it("should return 201 with the created item", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: sampleTodo.name });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: "mock-uuid-1234",
      name: sampleTodo.name,
      completed: false,
    });
    expect(mockDb.storeItem).toHaveBeenCalledTimes(1);
  });

  it("should trim whitespace from the name", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "  Buy groceries  " });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Buy groceries");
  });

  it("should return 400 if name is missing", async () => {
    const res = await request(app).post("/api/items").send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(mockDb.storeItem).not.toHaveBeenCalled();
  });

  it("should return 400 if name is an empty string", async () => {
    const res = await request(app).post("/api/items").send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 if name is only whitespace", async () => {
    const res = await request(app).post("/api/items").send({ name: "   " });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 if name is not a string", async () => {
    const res = await request(app).post("/api/items").send({ name: 123 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 500 if the database throws", async () => {
    mockDb.storeItem.mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .post("/api/items")
      .send({ name: "Buy groceries" });

    expect(res.status).toBe(500);
  });
});
