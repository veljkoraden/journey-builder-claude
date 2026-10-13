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

function ExtensionExample() {
  const { getFieldMap, setMapping } = usePrefillMappings();
  const targetNode = sampleGraph.nodes.find((node) => node.id === NODE_IDS.FORM_D)!;
  const providers = resolvePrefillProviders(
    { enabledSourceIds: ["tenant_settings"] },
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
  await userEvent.click(screen.getByRole("button", { name: "locale" }));
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
