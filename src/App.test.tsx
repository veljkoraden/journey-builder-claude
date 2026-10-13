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
    expect(groups.map((group) => group.querySelector("legend")?.textContent))
      .toEqual(["Action Properties", "Client Organization Properties", "Form Atransitive"]);
    await userEvent.click(modal.getByRole("button", { name: "action_id" }));
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
