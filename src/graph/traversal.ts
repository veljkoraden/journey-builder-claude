import type { BlueprintGraph, GraphNode } from "../api/types";

/** Index nodes by id for O(1) lookup. */
export function indexNodesById(graph: BlueprintGraph): Map<string, GraphNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

/** Existing immediate prerequisites, in declared order, without duplicates/self. */
export function getDirectDependencyIds(
  graph: BlueprintGraph,
  nodeId: string,
): string[] {
  const nodesById = indexNodesById(graph);
  return [...new Set(nodesById.get(nodeId)?.data.prerequisites ?? [])].filter(
    (id) => id !== nodeId && nodesById.has(id),
  );
}

/**
 * Existing upstream nodes in breadth-first order, nearest first.
 * Prerequisites are authoritative. Ignore dangling references and never return
 * the target itself, even on malformed cyclic input. This is not DAG validation.
 */
export function getAncestorIds(
  graph: BlueprintGraph,
  nodeId: string,
): string[] {
  const nodesById = indexNodesById(graph);
  const visited = new Set<string>([nodeId]);
  const ordered: string[] = [];
  const queue = [...(nodesById.get(nodeId)?.data.prerequisites ?? [])];

  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index];
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const current = nodesById.get(currentId);
    if (!current) continue;
    ordered.push(currentId);
    queue.push(...current.data.prerequisites);
  }

  return ordered;
}

/** Indirect ancestors only; direct dependencies take precedence on shared paths. */
export function getTransitiveDependencyIds(
  graph: BlueprintGraph,
  nodeId: string,
): string[] {
  const directIds = new Set(getDirectDependencyIds(graph, nodeId));
  return getAncestorIds(graph, nodeId).filter((id) => !directIds.has(id));
}
