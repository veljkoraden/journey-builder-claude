import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PrefillModal } from "./PrefillModal";
import { prefillProviders } from "../prefill/providers";
import { createFormResolver } from "../graph/formLookup";
import { sampleGraph, NODE_IDS } from "../mocks/sampleGraph";
import type { PrefillProviderContext } from "../prefill/types";

function context(): PrefillProviderContext {
  return {
    graph: sampleGraph,
    targetNode: sampleGraph.nodes.find((n) => n.id === NODE_IDS.FORM_D)!,
    getFormForNode: createFormResolver(sampleGraph),
  };
}

describe("PrefillModal", () => {
  it("renders option groups from all providers", () => {
    render(
      <PrefillModal
        fieldTitle="Email"
        providers={prefillProviders}
        context={context()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Form B")).toBeInTheDocument();
    expect(screen.getByText("Form A")).toBeInTheDocument();
    expect(screen.getByText("Action Properties")).toBeInTheDocument();
  });

  it("emits a composed PrefillSource when an option is chosen", async () => {
    const onSelect = vi.fn();
    render(
      <PrefillModal
        fieldTitle="Email"
        providers={prefillProviders}
        context={context()}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    // Select the exact source group, independent of provider display order.
    await userEvent.type(screen.getByPlaceholderText("Search fields"), "email");
    const group = screen.getByRole("group", { name: /Form A/ });
    await userEvent.click(within(group).getByRole("button", { name: "email" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      providerId: "transitive_dependencies",
      optionKey: `${NODE_IDS.FORM_A}:email`,
      label: "Form A.email",
    });
  });
});


describe("independent dependency sources in the picker", () => {
  it.each([
    ["direct_dependencies", "Form B", "Form A", NODE_IDS.FORM_B],
    ["transitive_dependencies", "Form A", "Form B", NODE_IDS.FORM_A],
  ])("renders and selects button sources from %s alone", async (id, name, absent, nodeId) => {
    const onSelect = vi.fn();
    render(
      <PrefillModal
        fieldTitle="Email"
        providers={prefillProviders.filter((provider) => provider.id === id)}
        context={context()}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(absent)).not.toBeInTheDocument();
    expect(screen.queryByText("Action Properties")).not.toBeInTheDocument();
    const group = screen.getByRole("group", { name: new RegExp(name) });
    await userEvent.click(within(group).getByRole("button", { name: "button" }));
    expect(onSelect).toHaveBeenCalledWith({
      providerId: id,
      optionKey: `${nodeId}:button`,
      label: `${name}.button`,
    });
  });
});
