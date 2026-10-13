import type { PrefillProvider } from "./types";

/** Resolve runtime data against known implementations; never silently enable defaults. */
export function resolvePrefillProviders(
  value: unknown,
  registry: readonly PrefillProvider[],
): PrefillProvider[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Prefill configuration must be an object with enabledSourceIds.");
  }
  if (Object.keys(value).some((key) => key !== "enabledSourceIds")) {
    throw new Error("Prefill configuration only supports enabledSourceIds.");
  }
  if (!("enabledSourceIds" in value) || !Array.isArray(value.enabledSourceIds)) {
    throw new Error("enabledSourceIds must be an array of source IDs.");
  }

  const available = new Map<string, PrefillProvider>();
  for (const provider of registry) {
    if (available.has(provider.id)) {
      throw new Error(`Duplicate provider ID in registry: ${provider.id}.`);
    }
    available.set(provider.id, provider);
  }

  const selected = new Set<string>();
  return value.enabledSourceIds.map((id: unknown) => {
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error("Each enabled source ID must be a non-empty string.");
    }
    if (selected.has(id)) {
      throw new Error(`Duplicate enabled source ID: ${id}.`);
    }
    const provider = available.get(id);
    if (!provider) {
      throw new Error(`Unknown prefill source ID: ${id}.`);
    }
    selected.add(id);
    return provider;
  });
}

/** Public deployment file, fetched at startup rather than bundled by Vite. */
export async function loadPrefillProviders(
  registry: readonly PrefillProvider[],
  signal?: AbortSignal,
): Promise<PrefillProvider[]> {
  const url = `${import.meta.env.BASE_URL}prefill-config.json`;
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load prefill configuration (HTTP ${response.status}).`);
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("Prefill configuration is not valid JSON.");
  }
  return resolvePrefillProviders(value, registry);
}
