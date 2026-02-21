import request from "supertest";
import express, { Application } from "express";
import deleteItem from "../../src/routes/deleteItem";
import { errorHandler } from "../../src/middleware/errorHandler";
import db from "../../src/persistence";
import { sampleTodo } from "../fixtures/todo";

jest.mock("../../src/persistence");
const mockDb = db as jest.Mocked<typeof db>;

const app: Application = express();
app.use(express.json());
app.delete("/api/items/:id", deleteItem);
app.use(errorHandler);

describe("DELETE /api/items/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 204 when item is successfully deleted", async () => {
    mockDb.removeItem.mockResolvedValue(true);

    const res = await request(app).delete(`/api/items/${sampleTodo.id}`);

    expect(res.status).toBe(204);
    expect(mockDb.removeItem).toHaveBeenCalledWith(sampleTodo.id);
  });

  it("should return 404 if the item does not exist", async () => {
    mockDb.removeItem.mockResolvedValue(false);

    const res = await request(app).delete("/api/items/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 500 if the database throws", async () => {
    mockDb.removeItem.mockRejectedValue(new Error("Database error"));

    const res = await request(app).delete(`/api/items/${sampleTodo.id}`);

    expect(res.status).toBe(500);
  });
});
