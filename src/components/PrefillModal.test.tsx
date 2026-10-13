import { render, screen } from "@testing-library/react";
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

    // Narrow to Form A's email option via search, then click it.
    await userEvent.type(screen.getByPlaceholderText("Search fields"), "email");
    const emailButtons = screen.getAllByRole("button", { name: "email" });
    await userEvent.click(emailButtons[emailButtons.length - 1]);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const arg = onSelect.mock.calls[0][0];
    expect(arg.providerId).toBe("form_field");
    expect(arg.label).toMatch(/^Form [AB]\.email$/);
  });
});
