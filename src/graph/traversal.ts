import type { BlueprintGraph, GraphNode } from "../api/types";

/** Index nodes by id for O(1) lookup. */
export function indexNodesById(graph: BlueprintGraph): Map<string, GraphNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

/** Direct prerequisites (the forms a node depends on immediately). */
export function getDirectDependencyIds(
  graph: BlueprintGraph,
  nodeId: string,
): string[] {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  return node ? [...node.data.prerequisites] : [];
}

/**
 * All upstream ancestors of a node, in breadth-first order (nearest first),
 * de-duplicated. Cycle-safe even though a well-formed blueprint is acyclic.
 *
 * For Form D this yields [Form B (direct), Form A (transitive)].
 */
export function getAncestorIds(
  graph: BlueprintGraph,
  nodeId: string,
): string[] {
  const nodesById = indexNodesById(graph);
  const visited = new Set<string>();
  const ordered: string[] = [];
  const queue: string[] = [...(nodesById.get(nodeId)?.data.prerequisites ?? [])];

  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    ordered.push(currentId);

    const current = nodesById.get(currentId);
    if (current) queue.push(...current.data.prerequisites);
  }

  return ordered;
}
