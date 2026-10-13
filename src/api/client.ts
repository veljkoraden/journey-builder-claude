import type { BlueprintGraph } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const TENANT_ID = import.meta.env.VITE_TENANT_ID ?? "1";
const BLUEPRINT_ID =
  import.meta.env.VITE_BLUEPRINT_ID ?? "bp_01jk766tckfwx84xjcxazggzyc";

/** URL for the `action-blueprint-graph-get` endpoint. */
export function buildGraphUrl(): string {
  return `${BASE_URL}/api/v1/${TENANT_ID}/actions/blueprints/${BLUEPRINT_ID}/graph`;
}

/** Fetch and parse the blueprint graph from the mock server. */
export async function fetchActionBlueprintGraph(
  signal?: AbortSignal,
): Promise<BlueprintGraph> {
  const url = buildGraphUrl();

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (cause) {
    throw new Error(
      `Could not reach the mock server at ${url}. ` +
        "Is it running? (clone frontendchallengeserver and run `npm start`)",
      { cause },
    );
  }

  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}.`);
  }

  return (await response.json()) as BlueprintGraph;
}
