import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { sampleGraph } from "./mocks/sampleGraph";

const ids = ["direct_dependencies", "transitive_dependencies", "global"];
const combinations = Array.from({ length: 8 }, (_, mask) => ({
  enabledSourceIds: ids.filter((_, index) => (mask & (1 << index)) !== 0),
}));

function serveConfig(config: unknown) {
  return vi.fn().mockImplementation(async (url: string) =>
    new Response(JSON.stringify(url.endsWith("prefill-config.json") ? config : sampleGraph)),
  );
}

async function openPicker() {
  await userEvent.click(await screen.findByRole("button", { name: "Form D" }));
  await userEvent.click(screen.getByRole("button", { name: /^Email/ }));
  return screen.getByRole("dialog");
}

afterEach(() => vi.unstubAllGlobals());

describe("runtime source configuration in the application", () => {
  it.each(combinations)("shows only configured categories: $enabledSourceIds", async (config) => {
    vi.stubGlobal("fetch", serveConfig(config));
    render(<App />);
    const modal = within(await openPicker());
    for (const [id, label] of [
      ["direct_dependencies", "Form B"],
      ["transitive_dependencies", "Form A"],
      ["global", "Action Properties"],
      ["global", "Client Organization Properties"],
    ]) {
      expect(Boolean(modal.queryByText(label))).toBe(config.enabledSourceIds.includes(id));
    }
    if (config.enabledSourceIds.length === 0) {
      expect(modal.getByRole("status")).toHaveTextContent("No prefill sources enabled.");
      expect(modal.queryAllByRole("group")).toHaveLength(0);
    }
  });

  it("honors configured group order and applies a global mapping", async () => {
    vi.stubGlobal("fetch", serveConfig({ enabledSourceIds: ["global", "transitive_dependencies"] }));
    render(<App />);
    const modal = within(await openPicker());
    const groups = modal.getAllByRole("group");
    expect(groups.map((group) => group.querySelector("legend")?.textContent?.replace("▸ ", "")))
      .toEqual(["Action Properties", "Client Organization Properties", "Form Atransitive"]);
    await userEvent.click(modal.getByRole("button", { name: "Action Properties" }));
    await userEvent.click(modal.getByRole("button", { name: "action_id" }));
    await userEvent.click(modal.getByRole("button", { name: /^Select$/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Action Properties.action_id")).toBeInTheDocument();
  });

  it("keeps configuration loading distinct from a valid empty configuration", async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) =>
      url.endsWith("prefill-config.json")
        ? new Promise<Response>((resolve) => { finish = resolve; })
        : Promise.resolve(new Response(JSON.stringify(sampleGraph))),
    ));
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading blueprint and prefill sources");
    expect(screen.queryByRole("button", { name: "Form D" })).not.toBeInTheDocument();
    await act(async () => finish(new Response('{"enabledSourceIds":[]}')));
    expect(within(await openPicker()).getByRole("status")).toHaveTextContent("No prefill sources enabled.");
  });

  it.each([
    [{ enabledSourceIds: ["global", "typo"] }, "Unknown prefill source ID"],
    [{ enabledSourceIds: ["global", "global"] }, "Duplicate enabled source ID"],
    [{}, "enabledSourceIds must be an array"],
  ])("shows an error without partial/default activation for %j", async (config, message) => {
    vi.stubGlobal("fetch", serveConfig(config));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("alert")).toHaveTextContent("Check prefill-config.json and reload");
    expect(screen.queryByRole("button", { name: "Form D" })).not.toBeInTheDocument();
  });

  it("reports a configuration request failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) =>
      url.endsWith("prefill-config.json")
        ? new Response("missing", { status: 404 })
        : new Response(JSON.stringify(sampleGraph)),
    ));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 404");
  });

  it("reads changed configuration on remount", async () => {
    let config = { enabledSourceIds: ["global"] };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) =>
      new Response(JSON.stringify(url.endsWith("prefill-config.json") ? config : sampleGraph)),
    ));
    const first = render(<App />);
    expect(within(await openPicker()).getByText("Action Properties")).toBeInTheDocument();
    first.unmount();
    config = { enabledSourceIds: ["direct_dependencies"] };
    render(<App />);
    const second = within(await openPicker());
    expect(second.getByText("Form B")).toBeInTheDocument();
    expect(second.queryByText("Action Properties")).not.toBeInTheDocument();
  });

  it("distinguishes no matching search results from disabled providers", async () => {
    vi.stubGlobal("fetch", serveConfig({ enabledSourceIds: ["global"] }));
    render(<App />);
    const modal = within(await openPicker());
    await userEvent.type(modal.getByRole("searchbox"), "no-such-field");
    expect(modal.getByRole("status")).toHaveTextContent("No matching data elements.");
  });
});

async function pickSource(form: string, field: string) {
  const modal = within(screen.getByRole("dialog"));
  await userEvent.type(modal.getByRole("searchbox"), field);
  await userEvent.click(within(modal.getByRole("group", { name: new RegExp(form) }))
    .getByRole("button", { name: field }));
}

async function confirmSource() {
  await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Select$/ }));
}

describe("confirmed prefill editing", () => {
  it("creates, cancels a replacement, replaces, navigates, and clears only the selected field", async () => {
    vi.stubGlobal("fetch", serveConfig({ enabledSourceIds: ids }));
    render(<App />);
    await openPicker();
    await pickSource("Form A", "email");
    await confirmSource();
    const emailRow = screen.getByRole("button", { name: /^Email: Form A.email$/ });
    expect(emailRow).toHaveFocus();

    await userEvent.click(emailRow);
    expect(screen.getByRole("button", { name: /^Select$/ })).toBeDisabled();
    await pickSource("Form B", "email");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(emailRow).toHaveFocus();
    expect(emailRow).toHaveTextContent("Form A.email");

    await userEvent.click(emailRow);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("button", { name: /^Select$/ })).toBeDisabled();
    await pickSource("Form B", "email");
    await confirmSource();
    expect(screen.getByRole("button", { name: /^Email: Form B.email$/ })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: /^Name No prefill/ }));
    await pickSource("Form A", "name");
    await confirmSource();
    await userEvent.click(screen.getByRole("button", { name: "Form E" }));
    expect(screen.getByRole("button", { name: /^Email No prefill/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Clear prefill/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Form D" }));
    expect(screen.getByText("Form B.email")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear prefill for Email" }));
    expect(screen.getByRole("button", { name: /^Email No prefill/ })).toHaveFocus();
    expect(screen.getByText("Form A.name")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["Cancel", "Close", "Escape", "backdrop"])("%s discards an unsaved mapping and restores focus", async (method) => {
    vi.stubGlobal("fetch", serveConfig({ enabledSourceIds: ids }));
    render(<App />);
    await openPicker();
    await pickSource("Form A", "email");
    if (method === "Escape") await userEvent.keyboard("{Escape}");
    else if (method === "backdrop") await userEvent.click(screen.getByRole("dialog").parentElement!);
    else await userEvent.click(screen.getByRole("button", { name: method }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const field = screen.getByRole("button", { name: /^Email No prefill/ });
    expect(field).toHaveFocus();
    await userEvent.click(field);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("button", { name: /^Select$/ })).toBeDisabled();
  });

  it("can complete a mapping with only the keyboard", async () => {
    vi.stubGlobal("fetch", serveConfig({ enabledSourceIds: ["transitive_dependencies"] }));
    render(<App />);
    const form = await screen.findByRole("button", { name: "Form D" });
    form.focus();
    await userEvent.keyboard("{Enter}");
    screen.getByRole("button", { name: /^Email No prefill/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    await userEvent.keyboard("email");
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "email" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /^Select$/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: /^Email: Form A.email$/ })).toHaveFocus();
  });
});
