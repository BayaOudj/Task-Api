import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError, TaskService } from "../src/tasks.js";

test("async create, list, read, update and delete lifecycle", async () => {
  const service = new TaskService();
  assert.deepEqual(await service.list(), []);
  const task = await service.create({
    title: "  Write tests  ",
    userId: "demo-user",
  });
  assert.equal(task.title, "Write tests");
  assert.equal(task.completed, false);
  assert.ok(task.id);
  assert.ok(!Number.isNaN(Date.parse(task.createdAt)));
  assert.deepEqual(await service.list(), [task]);
  assert.deepEqual(await service.get(task.id), task);
  const updated = await service.update(task.id, {
    completed: true,
    title: "Ship tests",
  });
  assert.equal(updated.completed, true);
  assert.equal(updated.title, "Ship tests");
  assert.equal(task.completed, false);
  await service.remove(task.id);
  assert.deepEqual(await service.list(), []);
  await assert.rejects(service.get(task.id), { status: 404 });
});

test("rejects invalid creation and unknown users without saving tasks", async () => {
  const service = new TaskService();
  for (const data of [
    null,
    [],
    {},
    { title: "", userId: "demo-user" },
    { title: "x".repeat(201), userId: "demo-user" },
    { title: "Valid", userId: "missing" },
  ])
    await assert.rejects(
      service.create(data),
      (error) => error instanceof ApiError && error.status === 400,
    );
  assert.deepEqual(await service.list(), []);
});

test("invalid updates preserve valid data; missing tasks reject", async () => {
  const service = new TaskService();
  const task = await service.create({ title: "Keep me", userId: "demo-user" });
  for (const data of [
    {},
    { completed: "yes" },
    { title: "" },
    { userId: "other" },
    { title: "Valid change", completed: 1 },
  ]) {
    await assert.rejects(service.update(task.id, data), { status: 400 });
    assert.deepEqual(await service.get(task.id), task);
  }
  await assert.rejects(service.update("missing", { completed: true }), {
    status: 404,
  });
  await assert.rejects(service.remove("missing"), { status: 404 });
});

test("returned tasks cannot mutate stored data and service instances are isolated", async () => {
  const service = new TaskService();
  const task = await service.create({ title: "Original", userId: "demo-user" });
  task.title = "Changed outside";
  const list = await service.list();
  list[0]!.title = "Changed list";
  assert.equal((await service.get(task.id)).title, "Original");
  assert.deepEqual(await new TaskService().list(), []);
});
