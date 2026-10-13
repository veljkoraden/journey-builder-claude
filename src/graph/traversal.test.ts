import { describe, expect, it } from "vitest";
import { sampleGraph, NODE_IDS } from "../mocks/sampleGraph";
import { getAncestorIds, getDirectDependencyIds } from "./traversal";

describe("graph traversal", () => {
  it("returns direct dependencies of Form D (just Form B)", () => {
    expect(getDirectDependencyIds(sampleGraph, NODE_IDS.FORM_D)).toEqual([
      NODE_IDS.FORM_B,
    ]);
  });

  it("returns ancestors of Form D nearest-first (B then A)", () => {
    expect(getAncestorIds(sampleGraph, NODE_IDS.FORM_D)).toEqual([
      NODE_IDS.FORM_B,
      NODE_IDS.FORM_A,
    ]);
  });

  it("returns no ancestors for a root form (Form A)", () => {
    expect(getAncestorIds(sampleGraph, NODE_IDS.FORM_A)).toEqual([]);
  });

  it("collects all ancestors of Form F without duplicating shared root A", () => {
    const ancestors = getAncestorIds(sampleGraph, NODE_IDS.FORM_F);
    expect(new Set(ancestors)).toEqual(
      new Set([
        NODE_IDS.FORM_D,
        NODE_IDS.FORM_E,
        NODE_IDS.FORM_B,
        NODE_IDS.FORM_C,
        NODE_IDS.FORM_A,
      ]),
    );
    // Form A is reachable via two paths but must appear once.
    expect(ancestors.filter((id) => id === NODE_IDS.FORM_A)).toHaveLength(1);
  });
});
