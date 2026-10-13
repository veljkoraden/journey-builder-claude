import { describe, expect, it } from "vitest";
import { sampleGraph, NODE_IDS } from "../mocks/sampleGraph";
import {
  getAncestorIds,
  getDirectDependencyIds,
  getTransitiveDependencyIds,
} from "./traversal";
import type { BlueprintGraph } from "../api/types";

const { FORM_A: A, FORM_B: B, FORM_C: C, FORM_D: D, FORM_E: E, FORM_F: F } = NODE_IDS;

function withPrerequisites(changes: Record<string, string[]>): BlueprintGraph {
  return {
    ...sampleGraph,
    nodes: sampleGraph.nodes.map((node) => ({
      ...node,
      data: { ...node.data, prerequisites: changes[node.id] ?? node.data.prerequisites },
    })),
  };
}

describe("graph traversal", () => {
  it.each([
    [A, [], [], []],
    [B, [A], [A], []],
    [C, [A], [A], []],
    [D, [B], [B, A], [A]],
    [E, [C], [C, A], [A]],
    [F, [D, E], [D, E, B, C, A], [B, C, A]],
    ["unknown", [], [], []],
  ])("resolves direct, breadth-first, and indirect sources for %s", (id, direct, all, indirect) => {
    expect(getDirectDependencyIds(sampleGraph, id)).toEqual(direct);
    expect(getAncestorIds(sampleGraph, id)).toEqual(all);
    expect(getTransitiveDependencyIds(sampleGraph, id)).toEqual(indirect);
  });

  it("gives direct dependencies precedence when also reachable indirectly", () => {
    const graph = withPrerequisites({ [D]: [B, A] });
    expect(getDirectDependencyIds(graph, D)).toEqual([B, A]);
    expect(getAncestorIds(graph, D)).toEqual([B, A]);
    expect(getTransitiveDependencyIds(graph, D)).toEqual([]);
  });

  it("ignores duplicate, dangling, and self prerequisites at any depth", () => {
    const graph = withPrerequisites({ [D]: [D, "missing", B, B], [B]: ["missing", A, A] });
    expect(getDirectDependencyIds(graph, D)).toEqual([B]);
    expect(getAncestorIds(graph, D)).toEqual([B, A]);
    expect(getTransitiveDependencyIds(graph, D)).toEqual([A]);
  });

  it("terminates a cycle through the target without offering the target", () => {
    const graph = withPrerequisites({ [A]: [D] });
    expect(getAncestorIds(graph, D)).toEqual([B, A]);
    expect(getTransitiveDependencyIds(graph, D)).toEqual([A]);
  });

  it("terminates an upstream cycle that does not include the target", () => {
    const graph = withPrerequisites({ [A]: [B] });
    expect(getAncestorIds(graph, D)).toEqual([B, A]);
  });

  it("uses prerequisites even when edges are absent", () => {
    expect(getAncestorIds({ ...sampleGraph, edges: [] }, D)).toEqual([B, A]);
  });

  it("handles an empty graph", () => {
    const graph = { ...sampleGraph, nodes: [], edges: [] };
    expect(getDirectDependencyIds(graph, D)).toEqual([]);
    expect(getAncestorIds(graph, D)).toEqual([]);
    expect(getTransitiveDependencyIds(graph, D)).toEqual([]);
  });

  it("does not mutate input or share returned arrays", () => {
    const graph = structuredClone(sampleGraph);
    getDirectDependencyIds(graph, D).push("new");
    getAncestorIds(graph, D).reverse();
    getTransitiveDependencyIds(graph, D).pop();
    expect(graph).toEqual(sampleGraph);
    expect(getAncestorIds(graph, D)).toEqual([B, A]);
  });
});
