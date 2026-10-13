import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPrefillProviders, resolvePrefillProviders } from "./configuration";
import { availablePrefillProviders } from "./providers";
import type { PrefillProvider } from "./types";

const ids = ["direct_dependencies", "transitive_dependencies", "global"];
const combinations = Array.from({ length: 8 }, (_, mask) =>
  ids.filter((_, index) => (mask & (1 << index)) !== 0),
);

afterEach(() => vi.unstubAllGlobals());

describe("runtime provider resolution", () => {
  it.each(combinations.map((enabledSourceIds) => ({ enabledSourceIds })))(
    "resolves exactly $enabledSourceIds",
    (config) => {
      expect(resolvePrefillProviders(config, availablePrefillProviders).map((provider) => provider.id))
        .toEqual(config.enabledSourceIds);
    },
  );

  it("preserves configured order and implementation identity without mutating inputs", () => {
    const config = { enabledSourceIds: ["global", "transitive_dependencies", "direct_dependencies"] };
    const before = [...availablePrefillProviders];
    const selected = resolvePrefillProviders(config, availablePrefillProviders);
    expect(selected).toEqual([...before].reverse());
    expect(selected[0]).toBe(before[2]);
    selected.pop();
    expect(availablePrefillProviders).toEqual(before);
    expect(config.enabledSourceIds).toEqual(["global", "transitive_dependencies", "direct_dependencies"]);
  });

  it.each([
    [null, "must be an object"],
    [[], "must be an object"],
    [true, "must be an object"],
    ["global", "must be an object"],
    [{}, "must be an array"],
    [{ enabledSourceIds: "global" }, "must be an array"],
    [{ enabledSourceIds: null }, "must be an array"],
    [{ enabledSourceIds: [null] }, "non-empty string"],
    [{ enabledSourceIds: [42] }, "non-empty string"],
    [{ enabledSourceIds: [{}] }, "non-empty string"],
    [{ enabledSourceIds: [""] }, "non-empty string"],
    [{ enabledSourceIds: ["  "] }, "non-empty string"],
    [{ enabledSourceIds: ["global", "missing"] }, "Unknown prefill source ID: missing"],
    [{ enabledSourceIds: [" global"] }, "Unknown prefill source ID"],
    [{ enabledSourceIds: ["Global"] }, "Unknown prefill source ID"],
    [{ enabledSourceIds: ["toString"] }, "Unknown prefill source ID"],
    [{ enabledSourceIds: ["global", "global"] }, "Duplicate enabled source ID"],
    [{ enabledSourceIds: [], enabledSources: [] }, "only supports enabledSourceIds"],
  ])("rejects invalid configuration %j", (config, message) => {
    expect(() => resolvePrefillProviders(config, availablePrefillProviders)).toThrow(message as string);
  });

  it("rejects duplicate registry identities even if none are enabled", () => {
    expect(() => resolvePrefillProviders({ enabledSourceIds: [] }, [
      availablePrefillProviders[0], availablePrefillProviders[0],
    ])).toThrow("Duplicate provider ID in registry");
  });

  it("accepts a new registered provider without adding IDs to the resolver", () => {
    const custom: PrefillProvider = { id: "tenant", label: "Tenant", getOptionGroups: () => [] };
    expect(resolvePrefillProviders({ enabledSourceIds: ["tenant"] }, [...availablePrefillProviders, custom]))
      .toEqual([custom]);
  });
});

describe("configuration loading", () => {
  it("fetches the external file without caching and forwards cancellation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ enabledSourceIds: ["global"] })));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    expect(await loadPrefillProviders(availablePrefillProviders, controller.signal))
      .toEqual([availablePrefillProviders[2]]);
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}prefill-config.json`, {
      signal: controller.signal, cache: "no-store",
    });
  });

  it.each([404, 500])("rejects HTTP %i instead of enabling defaults", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
    await expect(loadPrefillProviders(availablePrefillProviders)).rejects.toThrow(`HTTP ${status}`);
  });

  it.each(["{", "<html>SPA fallback</html>"])("rejects non-JSON response %s", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
    await expect(loadPrefillProviders(availablePrefillProviders)).rejects.toThrow("not valid JSON");
  });

  it("validates downloaded JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"enabledSourceIds":["unknown"]}')));
    await expect(loadPrefillProviders(availablePrefillProviders)).rejects.toThrow("Unknown prefill source ID");
  });

  it("propagates network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network offline")));
    await expect(loadPrefillProviders(availablePrefillProviders)).rejects.toThrow("Network offline");
  });
});
