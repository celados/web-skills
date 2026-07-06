import { defineConfig, type Plugin } from "vite";

import { checkoutRequest, createRequest, ensureUser, readState, resetState, setSession } from "./src/state";

type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: { code: string; message: string; hint?: string } };

type JsonRequest = {
  email?: string;
  name?: string;
  sourceUrl?: string;
  publicId?: string;
};

function sendJson(response: import("node:http").ServerResponse, status: number, body: ApiResponse) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body, null, 2));
}

async function readJson(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw) as JsonRequest;
}

function apiPlugin(): Plugin {
  return {
    name: "web-flow-testing-demo-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = request.url ?? "/";
        if (!url.startsWith("/api/")) {
          next();
          return;
        }

        try {
          if (request.method === "GET" && url === "/api/state") {
            sendJson(response, 200, { ok: true, data: readState() });
            return;
          }

          if (request.method === "POST" && url === "/api/reset") {
            const state = resetState();
            sendJson(response, 200, { ok: true, data: state });
            return;
          }

          if (request.method === "POST" && url === "/api/session") {
            const body = await readJson(request);
            const state = setSession({ email: body.email ?? null });
            sendJson(response, 200, { ok: true, data: state });
            return;
          }

          if (request.method === "POST" && url === "/api/users/ensure") {
            const body = await readJson(request);
            const user = ensureUser({ email: body.email, name: body.name, execute: true }).user;
            sendJson(response, 200, { ok: true, data: user });
            return;
          }

          if (request.method === "POST" && url === "/api/requests") {
            const body = await readJson(request);
            const flow = createRequest({ email: body.email, sourceUrl: body.sourceUrl });
            sendJson(response, 200, { ok: true, data: flow });
            return;
          }

          if (request.method === "POST" && url === "/api/checkout") {
            const body = await readJson(request);
            const flow = checkoutRequest({ publicId: body.publicId });
            sendJson(response, 200, { ok: true, data: flow });
            return;
          }

          sendJson(response, 404, {
            ok: false,
            error: {
              code: "ROUTE_NOT_FOUND",
              message: `No demo API route for ${request.method ?? "GET"} ${url}.`,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sendJson(response, 400, {
            ok: false,
            error: {
              code: "DEMO_API_ERROR",
              message,
            },
          });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [apiPlugin()],
  server: {
    port: 5174,
    strictPort: true,
  },
});
