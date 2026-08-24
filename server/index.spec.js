import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";

// Kept out so the assertions depend on the environment this test sets, rather
// than on whatever the developer happens to have in their local .env.
vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

const ORIGINAL_FRONTEND_PORT = process.env.VITE_FRONTEND_PORT;

/** Re-imports the app so it picks up the current environment variables. */
const loadApp = async () => {
  vi.resetModules();
  return (await import("./index.js")).default;
};

describe("cors configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    process.env.VITE_FRONTEND_PORT = ORIGINAL_FRONTEND_PORT;
  });

  it("allows the frontend origin named by VITE_FRONTEND_PORT", async () => {
    process.env.VITE_FRONTEND_PORT = "4321";
    const app = await loadApp();

    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:4321");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:4321");
  });

  it("falls back to the default vite port when VITE_FRONTEND_PORT is unset", async () => {
    delete process.env.VITE_FRONTEND_PORT;
    const app = await loadApp();

    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5173");

    // Without a fallback this is "http://localhost:undefined", which the
    // browser rejects, so every API call from the client fails.
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
