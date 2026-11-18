import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ApiError, demoUser, TaskService } from "./tasks.js";

function send(response: ServerResponse, status: number, data?: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(data === undefined ? undefined : JSON.stringify(data));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const buffers: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) throw new ApiError(413, "Request body is too large.");
    buffers.push(buffer);
  }
  if (
    request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !==
    "application/json"
  )
    throw new ApiError(415, "Use Content-Type: application/json.");
  try {
    const data: unknown = JSON.parse(Buffer.concat(buffers).toString("utf8"));
    return data;
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }
}

export function createApp(service = new TaskService()) {
  return createServer((request, response) => {
    void handle(request, response).catch((error) => {
      if (error instanceof ApiError)
        send(response, error.status, { error: error.message });
      else {
        console.error(error);
        send(response, 500, { error: "Internal server error." });
      }
    });
  });

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    const method = request.method;
    if (path === "/health" && method === "GET")
      return send(response, 200, { status: "ok" });
    if (path === "/users" && method === "GET")
      return send(response, 200, [demoUser]);
    if (path === "/tasks") {
      if (method === "GET") return send(response, 200, await service.list());
      if (method === "POST")
        return send(
          response,
          201,
          await service.create(await readJson(request)),
        );
      throw new ApiError(405, "Method not allowed.");
    }
    const match = /^\/tasks\/([^/]+)$/.exec(path);
    const id = match?.[1];
    if (id) {
      if (method === "GET") return send(response, 200, await service.get(id));
      if (method === "PATCH")
        return send(
          response,
          200,
          await service.update(id, await readJson(request)),
        );
      if (method === "DELETE") {
        await service.remove(id);
        return send(response, 204);
      }
      throw new ApiError(405, "Method not allowed.");
    }
    throw new ApiError(404, "Route not found.");
  }
}
