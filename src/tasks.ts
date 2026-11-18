import { randomUUID } from "node:crypto";
import type { Task, User } from "./models.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const demoUser: Readonly<User> = Object.freeze({
  id: "demo-user",
  name: "Demo User",
  email: "demo@example.com",
});

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new ApiError(400, "Expected a JSON object.");
  return value as Record<string, unknown>;
}

function title(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 200)
    throw new ApiError(400, "Title must contain 1–200 characters.");
  return value.trim();
}

// Async methods return Promises. Storage is deliberately local and in-memory.
export class TaskService {
  private readonly tasks = new Map<string, Task>();

  async list(): Promise<Task[]> {
    return Array.from(this.tasks.values(), (task) => ({ ...task }));
  }

  async get(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new ApiError(404, "Task not found.");
    return { ...task };
  }

  async create(input: unknown): Promise<Task> {
    const data = object(input);
    if (data.userId !== demoUser.id)
      throw new ApiError(400, "Use the demo-user userId.");
    const task: Task = {
      id: randomUUID(),
      title: title(data.title),
      completed: false,
      userId: demoUser.id,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return { ...task };
  }

  async update(id: string, input: unknown): Promise<Task> {
    const existing = await this.get(id);
    const data = object(input);
    const keys = Object.keys(data);
    if (
      !keys.length ||
      keys.some((key) => key !== "title" && key !== "completed")
    )
      throw new ApiError(400, "Update title and/or completed only.");
    const next = { ...existing };
    if ("title" in data) next.title = title(data.title);
    if ("completed" in data) {
      if (typeof data.completed !== "boolean")
        throw new ApiError(400, "Completed must be a boolean.");
      next.completed = data.completed;
    }
    this.tasks.set(id, next);
    return { ...next };
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    this.tasks.delete(id);
  }
}
