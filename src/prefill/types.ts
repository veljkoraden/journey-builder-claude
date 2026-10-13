import type { BlueprintGraph, FormDefinition, GraphNode } from "../api/types";

/**
 * A single selectable datum offered by a provider, e.g. one field of an
 * upstream form, or one global property. The `key` is opaque to the UI but
 * must be stable and unique within the provider; it encodes everything needed
 * to resolve the value at run time.
 */
export interface PrefillOption {
  key: string;
  label: string;
}

/**
 * A labelled collection of options, e.g. all fields of "Form A".
 * `badge` is an optional UI hint (e.g. "direct" / "transitive").
 */
export interface PrefillOptionGroup {
  id: string;
  label: string;
  badge?: string;
  options: PrefillOption[];
}

/** Everything a provider needs to compute its options for a target node. */
export interface PrefillProviderContext {
  graph: BlueprintGraph;
  /** The node whose fields are being configured (e.g. Form D). */
  targetNode: GraphNode;
  /** Resolve a node to its form definition. */
  getFormForNode: (node: GraphNode) => FormDefinition | undefined;
}

/**
 * A pluggable source of prefill data.
 *
 * To support a NEW data source, implement this interface and register the
 * instance in `providers/index.ts`. No consumer code needs to change.
 */
export interface PrefillProvider {
  /** Stable id, stored on every mapping this provider creates. */
  id: string;
  /** Human-readable name of the source category. */
  label: string;
  getOptionGroups: (context: PrefillProviderContext) => PrefillOptionGroup[];
}

/** A persisted prefill selection for one target field. */
export interface PrefillSource {
  /** Which provider produced this selection. */
  providerId: string;
  /** The chosen option's opaque key. */
  optionKey: string;
  /** Cached display label, e.g. "Form A.email". */
  label: string;
}

/** Maps a target field id to its chosen source. Absent key = not configured. */
export type FieldPrefillMap = Record<string, PrefillSource>;
