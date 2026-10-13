import { afterEach, describe, expect, it, vi } from "vitest";
import shippedConfig from "../../public/prefill-config.json";
import { loadPrefillProviders, resolvePrefillProviders } from "./configuration";
import { availablePrefillProviders } from "./providers";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("documented deployment configuration", () => {
  it("ships a configuration that resolves all built-in source categories", () => {
    expect(resolvePrefillProviders(shippedConfig, availablePrefillProviders).map((provider) => provider.id))
      .toEqual(["direct_dependencies", "transitive_dependencies", "global"]);
  });

  it.each(["/", "/journey/", "./"])("loads configuration under deployment base %s", async (base) => {
    vi.stubEnv("BASE_URL", base);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(shippedConfig)));
    vi.stubGlobal("fetch", fetchMock);
    await loadPrefillProviders(availablePrefillProviders);
    expect(fetchMock).toHaveBeenCalledWith(`${base}prefill-config.json`, {
      signal: undefined,
      cache: "no-store",
    });
  });

  it("reads changed deployed settings on the next load without retaining old providers", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(shippedConfig)))
      .mockResolvedValueOnce(new Response('{"enabledSourceIds":["global"]}'))
      .mockResolvedValueOnce(new Response('{"enabledSourceIds":[]}'));
    vi.stubGlobal("fetch", fetchMock);
    expect(await loadPrefillProviders(availablePrefillProviders)).toHaveLength(3);
    expect((await loadPrefillProviders(availablePrefillProviders)).map((provider) => provider.id)).toEqual(["global"]);
    expect(await loadPrefillProviders(availablePrefillProviders)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
