import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import officialGraph from "./test/fixtures/officialGraph.json";
import type { BlueprintGraph } from "./api/types";

const config = { enabledSourceIds: ["direct_dependencies", "transitive_dependencies", "global"] };

function serve(graph: BlueprintGraph = officialGraph as BlueprintGraph) {
  const fetchMock = vi.fn().mockImplementation(async (url: string) =>
    new Response(JSON.stringify(url.endsWith("prefill-config.json") ? config : graph)),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function copyGraph(): BlueprintGraph {
  return structuredClone(officialGraph) as BlueprintGraph;
}

async function selectForm(name: string) {
  await userEvent.click(await screen.findByRole("button", { name }));
}

async function choose(target: string, source: string, field: string, confirm = true) {
  await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${target}(?: |:)`) }));
  const modal = within(screen.getByRole("dialog"));
  await userEvent.type(modal.getByRole("searchbox"), field);
  await userEvent.click(within(modal.getByRole("group", { name: new RegExp(source) }))
    .getByRole("button", { name: field }));
  await userEvent.click(modal.getByRole("button", { name: confirm ? /^Select$/ : /^Cancel$/ }));
}

afterEach(() => vi.unstubAllGlobals());

describe("application loading and missing data", () => {
  it("waits for the graph even when configuration has loaded", async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) =>
      url.endsWith("prefill-config.json")
        ? Promise.resolve(new Response(JSON.stringify(config)))
        : new Promise<Response>((resolve) => { finish = resolve; }),
    ));
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading blueprint");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    await act(async () => finish(new Response(JSON.stringify(officialGraph))));
    expect(await screen.findByRole("button", { name: "Form D" })).toBeInTheDocument();
  });

  it.each([
    ["network", "Is it running?"],
    ["http", "status 503"],
    ["json", "not valid JSON"],
  ])("reports %s graph errors at the app boundary", async (failure, message) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith("prefill-config.json")) return new Response(JSON.stringify(config));
      if (failure === "network") throw new Error("Offline");
      return failure === "http" ? new Response("", { status: 503 }) : new Response("{");
    }));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load blueprint");
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it.each(["empty", "non-form"])("reports no forms for a %s graph", async (kind) => {
    const graph = copyGraph();
    graph.nodes = kind === "empty" ? [] : graph.nodes.map((node) => ({
      ...node, data: { ...node.data, component_type: "branch" },
    }));
    serve(graph);
    render(<App />);
    expect(await screen.findByText("No forms in this blueprint.")).toBeInTheDocument();
    expect(within(screen.getByRole("navigation")).queryAllByRole("button")).toHaveLength(0);
  });

  it("lists only form nodes in a mixed graph", async () => {
    const graph = copyGraph();
    graph.nodes.find((node) => node.data.name === "Form C")!.data.component_type = "branch";
    serve(graph);
    render(<App />);
    await screen.findByRole("button", { name: "Form D" });
    expect(screen.queryByRole("button", { name: "Form C" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("navigation")).getAllByRole("button")).toHaveLength(5);
  });

  it("explains a missing definition and permits selecting another form", async () => {
    const graph = copyGraph();
    graph.nodes.find((node) => node.data.name === "Form D")!.data.component_id = "missing";
    serve(graph);
    render(<App />);
    await selectForm("Form D");
    expect(screen.getByRole("alert")).toHaveTextContent("The form definition for Form D is unavailable.");
    expect(screen.queryByRole("button", { name: /^Email/ })).not.toBeInTheDocument();
    await selectForm("Form B");
    expect(screen.getByRole("button", { name: /^Email/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains a form with no configurable target fields", async () => {
    const graph = copyGraph();
    graph.forms.forEach((form) => { form.field_schema.properties = {
      button: { type: "object", avantos_type: "button" },
    }; });
    serve(graph);
    render(<App />);
    await selectForm("Form D");
    expect(screen.getByText("No configurable fields in this form.")).toBeInTheDocument();
  });
});

describe("official fixture workflows", () => {
  it("renders sorted forms and the full official source schema", async () => {
    const fetchMock = serve();
    render(<App />);
    await selectForm("Form D");
    expect(within(screen.getByRole("navigation")).getAllByRole("button").map((button) => button.textContent))
      .toEqual(["Form A", "Form B", "Form C", "Form D", "Form E", "Form F"]);
    expect(screen.getByRole("button", { name: /^multi_select/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Email/ }));
    const modal = within(screen.getByRole("dialog"));
    expect(modal.queryByText("Form C")).not.toBeInTheDocument();
    expect(modal.queryByText("Form D")).not.toBeInTheDocument();
    await userEvent.click(modal.getByRole("button", { name: /Form B/ }));
    const group = within(modal.getByRole("group", { name: /Form B/ }));
    expect(group.getByRole("button", { name: "multi_select" })).toBeInTheDocument();
    expect(group.getByRole("button", { name: "button" })).toBeInTheDocument();
    expect(group.queryByRole("button", { name: "completed_at" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/actions/blueprints/"))).toBe(true);
  });

  it("deduplicates a shared ancestor in the last form's picker", async () => {
    serve(); render(<App />);
    await selectForm("Form F");
    await userEvent.click(screen.getByRole("button", { name: /^Email/ }));
    const modal = within(screen.getByRole("dialog"));
    expect(modal.getAllByRole("group", { name: /Form A/ })).toHaveLength(1);
    expect(modal.getByRole("group", { name: /Form D.*direct/ })).toBeInTheDocument();
    expect(modal.getByRole("group", { name: /Form E.*direct/ })).toBeInTheDocument();
    expect(modal.getByRole("group", { name: /Form B.*transitive/ })).toBeInTheDocument();
  });

  it("isolates create, cancel, replace, and clear between nodes sharing one definition", async () => {
    serve(); render(<App />);
    await selectForm("Form D");
    await choose("Email", "Form A", "email");
    await choose("Name", "Form B", "name");
    await selectForm("Form E");
    await choose("Email", "Form C", "email");
    await selectForm("Form D");
    expect(screen.getByText("Form A.email")).toBeInTheDocument();
    await choose("Email", "Form B", "email", false);
    expect(screen.getByText("Form A.email")).toBeInTheDocument();
    await choose("Email", "Form B", "email");
    await userEvent.click(screen.getByRole("button", { name: "Clear prefill for Email" }));
    expect(screen.getByText("Form B.name")).toBeInTheDocument();
    await selectForm("Form E");
    expect(screen.getByText("Form C.email")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear prefill for Email" }));
    await selectForm("Form D");
    expect(screen.getByText("Form B.name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Email No prefill/ })).toBeInTheDocument();
  });

  it("offers global data for a root and resets mappings on app remount", async () => {
    serve();
    const first = render(<App />);
    await selectForm("Form A");
    await choose("Email", "Action Properties", "initiator_email");
    expect(screen.getByText("Action Properties.initiator_email")).toBeInTheDocument();
    first.unmount();
    render(<App />);
    await selectForm("Form A");
    expect(screen.getByRole("button", { name: /^Email No prefill/ })).toBeInTheDocument();
  });
});
