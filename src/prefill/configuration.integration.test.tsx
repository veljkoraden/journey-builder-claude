import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { PrefillModal } from "../components/PrefillModal";
import { sampleGraph, NODE_IDS } from "../mocks/sampleGraph";
import { createFormResolver } from "../graph/formLookup";
import { usePrefillMappings } from "./usePrefillMappings";
import { resolvePrefillProviders } from "./configuration";
import { availablePrefillProviders } from "./providers";
import type { PrefillProvider } from "./types";

const tenantProvider: PrefillProvider = {
  id: "tenant_settings",
  label: "Tenant settings",
  getOptionGroups: () => [{
    id: "tenant", label: "Tenant Settings", options: [{ key: "tenant:locale", label: "locale" }],
  }],
};

function ExtensionExample({ enabledSourceIds = ["tenant_settings"] }: { enabledSourceIds?: string[] }) {
  const { getFieldMap, setMapping } = usePrefillMappings();
  const targetNode = sampleGraph.nodes.find((node) => node.id === NODE_IDS.FORM_D)!;
  const providers = resolvePrefillProviders(
    { enabledSourceIds },
    [...availablePrefillProviders, tenantProvider],
  );
  return (
    <>
      <PrefillModal
        fieldTitle="Email"
        providers={providers}
        context={{ graph: sampleGraph, targetNode, getFormForNode: createFormResolver(sampleGraph) }}
        onSelect={(source) => setMapping(targetNode.id, "email", source)}
        onClose={() => {}}
      />
      <output aria-label="Saved mapping">{JSON.stringify(getFieldMap(targetNode.id))}</output>
    </>
  );
}

it("selects and stores a future provider's opaque identity without UI or store changes", async () => {
  render(<ExtensionExample />);
  expect(screen.queryByText("Form B")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Tenant Settings" }));
  await userEvent.click(screen.getByRole("button", { name: "locale" }));
  await userEvent.click(screen.getByRole("button", { name: /^Select$/ }));
  expect(JSON.parse(screen.getByLabelText("Saved mapping").textContent!)).toEqual({
    email: {
      providerId: "tenant_settings", optionKey: "tenant:locale", label: "Tenant Settings.locale",
    },
  });
});

it("distinguishes enabled providers with no eligible data from no enabled providers", () => {
  const targetNode = sampleGraph.nodes.find((node) => node.id === NODE_IDS.FORM_A)!;
  render(
    <PrefillModal
      fieldTitle="Email"
      providers={resolvePrefillProviders({ enabledSourceIds: ["direct_dependencies"] }, availablePrefillProviders)}
      context={{ graph: sampleGraph, targetNode, getFormForNode: createFormResolver(sampleGraph) }}
      onSelect={() => {}}
      onClose={() => {}}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("No available data elements for this form.");
});


it("combines a new provider with built-ins and confirms its identity independently", async () => {
  render(<ExtensionExample enabledSourceIds={["global", "tenant_settings", "direct_dependencies"]} />);
  const groups = screen.getAllByRole("group");
  expect(groups.map((group) => group.querySelector("legend")?.textContent?.replace("▸ ", "")))
    .toEqual(["Action Properties", "Client Organization Properties", "Tenant Settings", "Form Bdirect"]);
  await userEvent.click(screen.getByRole("button", { name: "Tenant Settings" }));
  await userEvent.click(screen.getByRole("button", { name: "locale" }));
  expect(screen.getByLabelText("Saved mapping")).toHaveTextContent("{}");
  await userEvent.click(screen.getByRole("button", { name: /^Select$/ }));
  expect(JSON.parse(screen.getByLabelText("Saved mapping").textContent!)).toEqual({
    email: { providerId: "tenant_settings", optionKey: "tenant:locale", label: "Tenant Settings.locale" },
  });
});

it("does not activate a registered example until configuration enables it", () => {
  render(<ExtensionExample enabledSourceIds={["global"]} />);
  expect(screen.queryByRole("group", { name: "Tenant Settings" })).not.toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Action Properties" })).toBeInTheDocument();
});
