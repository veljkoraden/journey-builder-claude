import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("uses documented VITE overrides for a custom API deployment", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://example.test/service");
  vi.stubEnv("VITE_TENANT_ID", "tenant-demo");
  vi.stubEnv("VITE_BLUEPRINT_ID", "blueprint-demo");
  vi.resetModules();
  const { buildGraphUrl } = await import("./client");
  expect(buildGraphUrl()).toBe("https://example.test/service/api/v1/tenant-demo/actions/blueprints/blueprint-demo/graph");
});

it("uses the documented localhost defaults without an environment file", async () => {
  vi.stubEnv("VITE_API_BASE_URL", undefined);
  vi.stubEnv("VITE_TENANT_ID", undefined);
  vi.stubEnv("VITE_BLUEPRINT_ID", undefined);
  vi.resetModules();
  const { buildGraphUrl } = await import("./client");
  expect(buildGraphUrl()).toBe("http://localhost:3000/api/v1/1/actions/blueprints/bp_01jk766tckfwx84xjcxazggzyc/graph");
});
