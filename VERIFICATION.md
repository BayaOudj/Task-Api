# Verification

Verified on 2026-11-18 with Node.js 26.13.0 and npm 11.20.0.
The project targets Node.js 24 or newer and pins Node 24 in `.nvmrc`.

- `npm install`: succeeded; dependency audit reported zero vulnerabilities.
- `npm run check`: strict typecheck, production compilation, and all seven tests passed.
- Four service tests cover the lifecycle, invalid input, missing tasks, unchanged
  data after rejected updates, defensive copies, and isolated service instances.
- Three real HTTP integration tests cover the lifecycle, JSON/status codes,
  malformed input, unsupported media types/methods, request size, route/task 404s,
  and unexpected failures returning generic 500 responses.

The sandboxed run passed the four service tests but could not bind HTTP test
ports (`EPERM`). A permitted outside-sandbox rerun passed all seven tests.
No assertions were disabled or weakened. HTTP tests use ephemeral localhost
ports and close their servers after each test.

This establishes tested demo behavior, not production security, durability,
load capacity, or deployed hosting. See README for limitations and AI disclosure.
