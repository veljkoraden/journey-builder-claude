import { describe, expect, it } from "vitest";
import { sampleGraph, NODE_IDS } from "../mocks/sampleGraph";
import { createFormResolver } from "../graph/formLookup";
import type { BlueprintGraph } from "../api/types";
import { availablePrefillProviders } from "./providers";
import { directFormFieldsProvider, transitiveFormFieldsProvider } from "./providers/upstreamFormFields";
import { globalDataProvider } from "./providers/globalData";
import type { PrefillProviderContext } from "./types";

const { FORM_A: A, FORM_B: B, FORM_D: D, FORM_E: E, FORM_F: F } = NODE_IDS;

function context(nodeId = D, graph: BlueprintGraph = sampleGraph): PrefillProviderContext {
  return {
    graph,
    targetNode: graph.nodes.find((node) => node.id === nodeId)!,
    getFormForNode: createFormResolver(graph),
  };
}

const providers = [directFormFieldsProvider, transitiveFormFieldsProvider];

describe("form field providers", () => {
  it.each([
    [directFormFieldsProvider, B, "Form B", "direct"],
    [transitiveFormFieldsProvider, A, "Form A", "transitive"],
  ])("%s offers exactly the eligible Form D source", (provider, id, label, badge) => {
    const groups = provider.getOptionGroups(context());
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ id, label, badge });
    expect(groups[0].options).toContainEqual({ key: `${id}:email`, label: "email" });
    expect(groups[0].options).toContainEqual({ key: `${id}:button`, label: "button" });
    expect(groups[0].options.map((option) => option.label)).toEqual(
      Object.keys(sampleGraph.forms[0].field_schema.properties),
    );
  });

  it.each(providers)("$id offers no upstream groups for a root", (provider) => {
    expect(provider.getOptionGroups(context(A))).toEqual([]);
  });

  it("keeps shared form definitions distinct by node and deduplicates ancestors", () => {
    const direct = directFormFieldsProvider.getOptionGroups(context(F));
    const transitive = transitiveFormFieldsProvider.getOptionGroups(context(F));
    expect(direct.map((group) => group.id)).toEqual([D, E]);
    expect(direct.map((group) => group.options.find((option) => option.label === "email")?.key))
      .toEqual([`${D}:email`, `${E}:email`]);
    expect(transitive.map((group) => group.label)).toEqual(["Form B", "Form C", "Form A"]);
  });

  it.each(providers)("$id keeps option identity when forms and field titles are renamed", (provider) => {
    const graph = structuredClone(sampleGraph);
    graph.nodes.forEach((node) => { node.data.name = "Renamed"; });
    graph.forms.forEach((form) => { form.field_schema.properties.email.title = "New title"; });
    const before = provider.getOptionGroups(context());
    const after = provider.getOptionGroups(context(D, graph));
    expect(after[0].label).toBe("Renamed");
    expect(after[0].id).toBe(before[0].id);
    expect(after[0].options).toEqual(before[0].options);
  });

  it("skips a missing form definition but still reaches its ancestors", () => {
    const graph = structuredClone(sampleGraph);
    graph.nodes.find((node) => node.id === B)!.data.component_id = "missing";
    expect(directFormFieldsProvider.getOptionGroups(context(D, graph))).toEqual([]);
    expect(transitiveFormFieldsProvider.getOptionGroups(context(D, graph)).map((group) => group.id)).toEqual([A]);
  });

  it("traverses through non-form nodes without exposing them as forms", () => {
    const graph = structuredClone(sampleGraph);
    graph.nodes.find((node) => node.id === B)!.data.component_type = "branch";
    expect(directFormFieldsProvider.getOptionGroups(context(D, graph))).toEqual([]);
    expect(transitiveFormFieldsProvider.getOptionGroups(context(D, graph)).map((group) => group.id)).toEqual([A]);
  });

  it("does not render empty source groups", () => {
    const graph = structuredClone(sampleGraph);
    graph.forms.forEach((form) => { form.field_schema.properties = {}; });
    for (const provider of providers) {
      expect(provider.getOptionGroups(context(D, graph))).toEqual([]);
    }
  });

  it("ignores dangling references and excludes the target during a cycle", () => {
    const graph = structuredClone(sampleGraph);
    graph.nodes.find((node) => node.id === D)!.data.prerequisites = [D, "missing", B, B];
    graph.nodes.find((node) => node.id === A)!.data.prerequisites = [D];
    expect(directFormFieldsProvider.getOptionGroups(context(D, graph)).map((group) => group.id)).toEqual([B]);
    expect(transitiveFormFieldsProvider.getOptionGroups(context(D, graph)).map((group) => group.id)).toEqual([A]);
  });

  it("does not offer the same ancestor in both categories", () => {
    const graph = structuredClone(sampleGraph);
    graph.nodes.find((node) => node.id === D)!.data.prerequisites = [B, A];
    expect(directFormFieldsProvider.getOptionGroups(context(D, graph)).map((group) => group.id)).toEqual([B, A]);
    expect(transitiveFormFieldsProvider.getOptionGroups(context(D, graph))).toEqual([]);
  });
});

describe("provider registry", () => {
  it("registers distinct direct, transitive, and global identities", () => {
    expect(availablePrefillProviders.map((provider) => provider.id)).toEqual([
      "direct_dependencies", "transitive_dependencies", "global",
    ]);
    expect(availablePrefillProviders.flatMap((provider) => provider.getOptionGroups(context())).map((group) => group.label))
      .toEqual(["Form B", "Form A", "Action Properties", "Client Organization Properties"]);
  });

  it("offers the same global data independently of graph dependencies", () => {
    expect(globalDataProvider.getOptionGroups(context(A))).toEqual(globalDataProvider.getOptionGroups(context(F)));
    expect(globalDataProvider.getOptionGroups(context(A)).flatMap((group) => group.options).length).toBeGreaterThan(0);
  });
});
