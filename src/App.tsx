import { useMemo, useState } from "react";
import { useBlueprintGraph } from "./api/useBlueprintGraph";
import { createFormResolver } from "./graph/formLookup";
import { usePrefillProviders } from "./prefill/usePrefillProviders";
import { usePrefillMappings } from "./prefill/usePrefillMappings";
import type { PrefillProviderContext } from "./prefill/types";
import { FormList } from "./components/FormList";
import { PrefillEditor } from "./components/PrefillEditor";
import { PrefillModal } from "./components/PrefillModal";
import { getTargetFields } from "./prefill/fieldUtils";

export default function App() {
  const state = useBlueprintGraph();
  const providerState = usePrefillProviders();
  const { getFieldMap, setMapping, clearMapping } = usePrefillMappings();

  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [editingFieldId, setEditingFieldId] = useState<string>();

  const graph = state.status === "ready" ? state.graph : undefined;
  const getFormForNode = useMemo(
    () => (graph ? createFormResolver(graph) : undefined),
    [graph],
  );

  if (state.status === "error") {
    return (
      <main className="app app--message" role="alert">
        <h1>Could not load blueprint</h1>
        <p>{state.error.message}</p>
      </main>
    );
  }

  if (providerState.status === "error") {
    return (
      <main className="app app--message" role="alert">
        <h1>Could not load prefill sources</h1>
        <p>{providerState.error.message}</p>
        <p>Check prefill-config.json and reload the page.</p>
      </main>
    );
  }

  if (state.status === "loading" || providerState.status === "loading") {
    return <main className="app app--message" role="status">Loading blueprint and prefill sources…</main>;
  }

  const formNodes = graph!.nodes.filter((node) => node.data.component_type === "form");
  const selectedNode = formNodes.find((node) => node.id === selectedNodeId);
  const selectedForm = selectedNode ? getFormForNode!(selectedNode) : undefined;

  const editingField =
    selectedForm && editingFieldId
      ? getTargetFields(selectedForm).find((f) => f.name === editingFieldId)
      : undefined;

  const modalContext: PrefillProviderContext | undefined =
    selectedNode && getFormForNode
      ? { graph: graph!, targetNode: selectedNode, getFormForNode }
      : undefined;

  return (
    <main className="app">
      <header className="app__header">
        <h1>{graph!.name}</h1>
      </header>

      <div className="app__body">
        <FormList
          nodes={formNodes}
          selectedNodeId={selectedNodeId}
          onSelect={(id) => {
            setSelectedNodeId(id);
            setEditingFieldId(undefined);
          }}
        />

        <div className="app__detail">
          {selectedNode && selectedForm ? (
            <PrefillEditor
              node={selectedNode}
              form={selectedForm}
              fieldMap={getFieldMap(selectedNode.id)}
              onPickField={setEditingFieldId}
              onClearField={(fieldId) => clearMapping(selectedNode.id, fieldId)}
            />
          ) : selectedNode ? (
            <p role="alert">The form definition for {selectedNode.data.name} is unavailable.</p>
          ) : formNodes.length === 0 ? (
            <p role="status">No forms in this blueprint.</p>
          ) : (
            <p className="app__hint">Select a form to configure its prefill.</p>
          )}
        </div>
      </div>

      {selectedNode && editingField && modalContext && (
        <PrefillModal
          key={JSON.stringify([selectedNode.id, editingField.name])}
          fieldTitle={editingField.title}
          providers={providerState.providers}
          context={modalContext}
          onClose={() => setEditingFieldId(undefined)}
          onSelect={(source) => {
            setMapping(selectedNode.id, editingField.name, source);
            setEditingFieldId(undefined);
          }}
        />
      )}
    </main>
  );
}
