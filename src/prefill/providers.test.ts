import { describe, expect, it } from "vitest";
import { sampleGraph, NODE_IDS } from "../mocks/sampleGraph";
import { createFormResolver } from "../graph/formLookup";
import { prefillProviders } from "./providers";
import { upstreamFormFieldsProvider } from "./providers/upstreamFormFields";
import { globalDataProvider } from "./providers/globalData";
import type { PrefillProviderContext } from "./types";

function contextForNode(nodeId: string): PrefillProviderContext {
  const targetNode = sampleGraph.nodes.find((node) => node.id === nodeId)!;
  return {
    graph: sampleGraph,
    targetNode,
    getFormForNode: createFormResolver(sampleGraph),
  };
}

describe("upstreamFormFieldsProvider", () => {
  const groups = upstreamFormFieldsProvider.getOptionGroups(
    contextForNode(NODE_IDS.FORM_D),
  );

  it("produces one group per upstream form (B and A)", () => {
    expect(groups.map((group) => group.label)).toEqual(["Form B", "Form A"]);
  });

  it("badges Form B as direct and Form A as transitive", () => {
    expect(groups.find((g) => g.label === "Form B")?.badge).toBe("direct");
    expect(groups.find((g) => g.label === "Form A")?.badge).toBe("transitive");
  });

  it("excludes button fields and exposes data fields like email", () => {
    const formBOptions = groups[0].options.map((o) => o.label);
    expect(formBOptions).toContain("email");
    expect(formBOptions).not.toContain("button");
  });

  it("produces option keys that encode source node and field", () => {
    const emailOption = groups[0].options.find((o) => o.label === "email")!;
    expect(emailOption.key).toBe(`${NODE_IDS.FORM_B}:email`);
  });
});

describe("globalDataProvider", () => {
  it("offers global property groups regardless of the target node", () => {
    const groups = globalDataProvider.getOptionGroups(
      contextForNode(NODE_IDS.FORM_A),
    );
    expect(groups.map((g) => g.label)).toContain("Action Properties");
    expect(groups.flatMap((g) => g.options).length).toBeGreaterThan(0);
  });
});

describe("provider registry", () => {
  it("aggregates option groups from every registered provider", () => {
    const context = contextForNode(NODE_IDS.FORM_D);
    const allGroups = prefillProviders.flatMap((provider) =>
      provider.getOptionGroups(context),
    );
    // Upstream groups (B, A) + the two global groups.
    expect(allGroups.length).toBeGreaterThanOrEqual(4);
  });
});
