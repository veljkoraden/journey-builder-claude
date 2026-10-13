import type { BlueprintGraph, FormDefinition, GraphNode } from "../api/types";

/**
 * Returns a resolver from a node to its form definition.
 * Nodes reference forms by `component_id`; several nodes may share one form.
 */
export function createFormResolver(
  graph: BlueprintGraph,
): (node: GraphNode) => FormDefinition | undefined {
  const formsById = new Map(graph.forms.map((form) => [form.id, form]));
  return (node) => formsById.get(node.data.component_id);
}
