import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PrefillModal } from "./PrefillModal";
import { availablePrefillProviders } from "../prefill/providers";
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
        providers={availablePrefillProviders}
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
        providers={availablePrefillProviders}
        context={context()}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    // Select the exact source group, independent of provider display order.
    await userEvent.type(screen.getByPlaceholderText("Search fields"), "email");
    const group = screen.getByRole("group", { name: /Form A/ });
    await userEvent.click(within(group).getByRole("button", { name: "email" }));

    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /^Select$/ }));
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
        providers={availablePrefillProviders.filter((provider) => provider.id === id)}
        context={context()}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(absent)).not.toBeInTheDocument();
    expect(screen.queryByText("Action Properties")).not.toBeInTheDocument();
    const group = screen.getByRole("group", { name: new RegExp(name) });
    await userEvent.click(within(group).getByRole("button", { expanded: false }));
    await userEvent.click(within(group).getByRole("button", { name: "button" }));
    await userEvent.click(screen.getByRole("button", { name: /^Select$/ }));
    expect(onSelect).toHaveBeenCalledWith({
      providerId: id,
      optionKey: `${nodeId}:button`,
      label: `${name}.button`,
    });
  });
});

function renderPicker(providers = availablePrefillProviders) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const props = { fieldTitle: "Email", providers, context: context(), onSelect, onClose };
  return { ...render(<PrefillModal {...props} />), props, onSelect, onClose };
}

async function chooseEmail(form = "Form A") {
  await userEvent.type(screen.getByRole("searchbox", { name: "Search available data" }), "email");
  await userEvent.click(within(screen.getByRole("group", { name: new RegExp(form) }))
    .getByRole("button", { name: "email" }));
}

describe("draft selection and disclosures", () => {
  it("starts collapsed with disabled confirmation and labeled search focus", () => {
    renderPicker();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Select data element to map Email");
    expect(screen.getByRole("searchbox", { name: "Search available data" })).toHaveFocus();
    expect(screen.getByRole("button", { name: /^Select$/ })).toBeDisabled();
    expect(screen.queryAllByRole("button", { name: "email" })).toHaveLength(0);
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(4);
  });

  it("expands and collapses a group using the keyboard", async () => {
    renderPicker();
    const toggle = screen.getByRole("button", { name: /Form B/ });
    toggle.focus();
    await userEvent.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).not.toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: "email" })).toBeVisible();
    await userEvent.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "email" })).not.toBeInTheDocument();
  });

  it("lets a later choice replace a draft and commits exactly once on Select", async () => {
    const { onSelect } = renderPicker();
    await chooseEmail();
    const formA = within(screen.getByRole("group", { name: /Form A/ })).getByRole("button", { name: "email" });
    expect(formA).toHaveAttribute("aria-pressed", "true");
    const formB = within(screen.getByRole("group", { name: /Form B/ })).getByRole("button", { name: "email" });
    await userEvent.click(formB);
    expect(formA).toHaveAttribute("aria-pressed", "false");
    expect(formB).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Selected: Form B.email")).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /^Select$/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      providerId: "direct_dependencies", optionKey: `${NODE_IDS.FORM_B}:email`, label: "Form B.email",
    });
  });

  it.each(["Cancel", "Close", "Escape", "backdrop"])("%s dismisses a draft without committing", async (method) => {
    const { onSelect, onClose } = renderPicker();
    await chooseEmail();
    if (method === "Escape") await userEvent.keyboard("{Escape}");
    else if (method === "backdrop") await userEvent.click(screen.getByRole("dialog").parentElement!);
    else await userEvent.click(screen.getByRole("button", { name: method }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss when clicking inside the dialog", async () => {
    const { onClose } = renderPicker();
    await userEvent.click(screen.getByRole("heading"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("searches group names case-insensitively and exposes matching options", async () => {
    renderPicker();
    await userEvent.type(screen.getByRole("searchbox"), "  fOrM a  ");
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "email" })).toBeVisible();
    await userEvent.clear(screen.getByRole("searchbox"));
    expect(screen.getAllByRole("group")).toHaveLength(4);
    expect(screen.queryAllByRole("button", { name: "email" })).toHaveLength(0);
  });

  it("preserves the visible draft summary even when search hides its group", async () => {
    const { onSelect } = renderPicker();
    await chooseEmail();
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "nothing-matches");
    expect(screen.getByRole("status")).toHaveTextContent("No matching data elements.");
    expect(screen.getByText("Selected: Form A.email")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Select$/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ optionKey: `${NODE_IDS.FORM_A}:email` }));
  });

  it("cannot confirm a draft whose provider has been removed", async () => {
    const { rerender, props, onSelect } = renderPicker();
    await chooseEmail();
    rerender(<PrefillModal {...props} providers={[]} />);
    expect(screen.getByRole("button", { name: /^Select$/ })).toBeDisabled();
    expect(screen.queryByText("Selected: Form A.email")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Select$/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps draft identities separate when providers reuse group and option keys", async () => {
    const providers = ["first", "second"].map((id) => ({
      id, label: id, getOptionGroups: () => [{ id: "same", label: id, options: [{ key: "same", label: "value" }] }],
    }));
    const { onSelect } = renderPicker(providers);
    await userEvent.type(screen.getByRole("searchbox"), "value");
    await userEvent.click(within(screen.getByRole("group", { name: "second" })).getByRole("button", { name: "value" }));
    expect(within(screen.getByRole("group", { name: "first" })).getByRole("button", { name: "value" }))
      .toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: /^Select$/ }));
    expect(onSelect).toHaveBeenCalledWith({ providerId: "second", optionKey: "same", label: "second.value" });
  });
});

describe("dialog focus", () => {
  it("wraps Tab in both directions and skips collapsed/disabled controls", async () => {
    renderPicker();
    const close = screen.getByRole("button", { name: "Close" });
    const cancel = screen.getByRole("button", { name: "Cancel" });
    close.focus();
    await userEvent.tab({ shift: true });
    expect(cancel).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await chooseEmail();
    const select = screen.getByRole("button", { name: /^Select$/ });
    close.focus();
    await userEvent.tab({ shift: true });
    expect(select).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
  });

  it("contains external focus, restores the opener and body scrolling on unmount", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    document.body.style.overflow = "auto";
    const { unmount } = renderPicker();
    expect(document.body.style.overflow).toBe("hidden");
    opener.focus();
    expect(screen.getByRole("searchbox")).toHaveFocus();
    unmount();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("auto");
    opener.remove();
    document.body.style.overflow = "";
  });
});
