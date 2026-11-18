import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { createApp } from "../src/app.js";
import type { Task } from "../src/models.js";
import { TaskService } from "../src/tasks.js";

async function withServer(
  run: (base: string) => Promise<void>,
  service?: TaskService,
) {
  const server = createApp(service);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("HTTP task lifecycle exposes correct statuses and JSON", async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });
    const users = (await (await fetch(`${base}/users`)).json()) as {
      id: string;
    }[];
    assert.equal(users[0]?.id, "demo-user");
    const created = await fetch(`${base}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Learn async", userId: "demo-user" }),
    });
    assert.equal(created.status, 201);
    const task = (await created.json()) as Task;
    assert.equal(task.title, "Learn async");
    assert.deepEqual(await (await fetch(`${base}/tasks`)).json(), [task]);
    const patched = await fetch(`${base}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    assert.equal(patched.status, 200);
    assert.equal(((await patched.json()) as Task).completed, true);
    assert.equal((await fetch(`${base}/tasks/${task.id}`)).status, 200);
    const removed = await fetch(`${base}/tasks/${task.id}`, {
      method: "DELETE",
    });
    assert.equal(removed.status, 204);
    assert.equal(await removed.text(), "");
    assert.equal((await fetch(`${base}/tasks/${task.id}`)).status, 404);
  });
});

test("HTTP handles malformed JSON, invalid data, media type, size and routes", async () => {
  await withServer(async (base) => {
    for (const [body, mediaType, status] of [
      ["{", "application/json", 400],
      ["{}", "application/json", 400],
      ["{}", "text/plain", 415],
      ["x".repeat(16_385), "application/json", 413],
    ] as const) {
      const response = await fetch(`${base}/tasks`, {
        method: "POST",
        headers: { "Content-Type": mediaType },
        body,
      });
      assert.equal(response.status, status);
      assert.equal(
        typeof ((await response.json()) as { error: unknown }).error,
        "string",
      );
    }
    assert.equal((await fetch(`${base}/unknown`)).status, 404);
    assert.equal((await fetch(`${base}/tasks`, { method: "PUT" })).status, 405);
    assert.deepEqual(await (await fetch(`${base}/tasks`)).json(), []);
  });
});

test("unexpected failures return a generic 500 response", async (t) => {
  class BrokenService extends TaskService {
    override async list(): Promise<Task[]> {
      throw new Error("Private database details");
    }
  }
  const log = t.mock.method(console, "error", () => {});
  await withServer(async (base) => {
    const response = await fetch(`${base}/tasks`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: "Internal server error.",
    });
    assert.equal(log.mock.callCount(), 1);
  }, new BrokenService());
});
