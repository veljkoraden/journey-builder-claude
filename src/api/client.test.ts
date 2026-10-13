import { afterEach, describe, expect, it, vi } from "vitest";
import { buildGraphUrl, fetchActionBlueprintGraph } from "./client";
import officialGraph from "../test/fixtures/officialGraph.json";

afterEach(() => vi.unstubAllGlobals());

describe("blueprint API client", () => {
  it("fetches the configured graph URL and preserves the official response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(officialGraph)));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    expect(await fetchActionBlueprintGraph(controller.signal)).toEqual(officialGraph);
    expect(fetchMock).toHaveBeenCalledWith(buildGraphUrl(), { signal: controller.signal });
    expect(buildGraphUrl()).toContain("/actions/blueprints/");
    expect(buildGraphUrl()).toMatch(/\/graph$/);
  });

  it.each([404, 500, 503])("reports HTTP %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
    await expect(fetchActionBlueprintGraph()).rejects.toThrow(`status ${status}`);
  });

  it.each(["{", "<html>Not JSON</html>"])("reports invalid JSON: %s", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
    await expect(fetchActionBlueprintGraph()).rejects.toThrow("blueprint response is not valid JSON");
  });

  it("gives startup guidance on network failure and retains its cause", async () => {
    const cause = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cause));
    await expect(fetchActionBlueprintGraph()).rejects.toMatchObject({
      message: expect.stringContaining("Is it running?"), cause,
    });
  });
});
