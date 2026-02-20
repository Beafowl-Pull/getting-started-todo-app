import request from "supertest";
import express, { Application } from "express";
import updateItem from "../../src/routes/updateItem";
import { errorHandler } from "../../src/middleware/errorHandler";
import db from "../../src/persistence";
import { sampleTodo } from "../fixtures/todo";

jest.mock("../../src/persistence");
const mockDb = db as jest.Mocked<typeof db>;

const app: Application = express();
app.use(express.json());
app.put("/api/items/:id", updateItem);
app.use(errorHandler); // ← intercepte ZodError + HttpError

describe("PUT /api/items/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.updateItem.mockResolvedValue();
  });

  it("should return 200 with the updated item when updating name", async () => {
    const updated = { ...sampleTodo, name: "Buy vegetables" };
    mockDb.getItem
      .mockResolvedValueOnce(sampleTodo)
      .mockResolvedValueOnce(updated);

    const res = await request(app)
      .put(`/api/items/${sampleTodo.id}`)
      .send({ name: "Buy vegetables" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Buy vegetables");
    expect(mockDb.updateItem).toHaveBeenCalledWith(sampleTodo.id, {
      name: "Buy vegetables",
      completed: false,
    });
  });

  it("should return 200 when updating completed", async () => {
    const updated = { ...sampleTodo, completed: true };
    mockDb.getItem
      .mockResolvedValueOnce(sampleTodo)
      .mockResolvedValueOnce(updated);

    const res = await request(app)
      .put(`/api/items/${sampleTodo.id}`)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it("should trim whitespace from the name", async () => {
    const updated = { ...sampleTodo, name: "Buy vegetables" };
    mockDb.getItem
      .mockResolvedValueOnce(sampleTodo)
      .mockResolvedValueOnce(updated);

    await request(app)
      .put(`/api/items/${sampleTodo.id}`)
      .send({ name: "  Buy vegetables  " });

    expect(mockDb.updateItem).toHaveBeenCalledWith(sampleTodo.id, {
      name: "Buy vegetables",
      completed: false,
    });
  });

  it("should return 404 if the item does not exist", async () => {
    mockDb.getItem.mockResolvedValue(undefined);

    const res = await request(app)
      .put("/api/items/nonexistent")
      .send({ name: "New name" });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(mockDb.updateItem).not.toHaveBeenCalled();
  });

  it("should return 400 if body is empty", async () => {
    const res = await request(app).put(`/api/items/${sampleTodo.id}`).send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 if name is empty string", async () => {
    const res = await request(app)
      .put(`/api/items/${sampleTodo.id}`)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("should return 400 if completed is not a boolean", async () => {
    const res = await request(app)
      .put(`/api/items/${sampleTodo.id}`)
      .send({ completed: "yes" });

    expect(res.status).toBe(400);
  });

  it("should return 500 if the database throws", async () => {
    mockDb.getItem.mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .put(`/api/items/${sampleTodo.id}`)
      .send({ name: "New name" });

    expect(res.status).toBe(500);
  });
});
