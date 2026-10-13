import { useMemo, useState } from "react";
import { useBlueprintGraph } from "./api/useBlueprintGraph";
import { createFormResolver } from "./graph/formLookup";
import { prefillProviders } from "./prefill/providers";
import { usePrefillMappings } from "./prefill/usePrefillMappings";
import type { PrefillProviderContext } from "./prefill/types";
import { FormList } from "./components/FormList";
import { PrefillEditor } from "./components/PrefillEditor";
import { PrefillModal } from "./components/PrefillModal";
import { getConfigurableFields } from "./prefill/fieldUtils";

export default function App() {
  const state = useBlueprintGraph();
  const { getFieldMap, setMapping, clearMapping } = usePrefillMappings();

  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [editingFieldId, setEditingFieldId] = useState<string>();

  const graph = state.status === "ready" ? state.graph : undefined;
  const getFormForNode = useMemo(
    () => (graph ? createFormResolver(graph) : undefined),
    [graph],
  );

  if (state.status === "loading") {
    return <main className="app app--message">Loading blueprint…</main>;
  }

  if (state.status === "error") {
    return (
      <main className="app app--message">
        <h1>Could not load blueprint</h1>
        <p>{state.error.message}</p>
      </main>
    );
  }

  const selectedNode = graph!.nodes.find((node) => node.id === selectedNodeId);
  const selectedForm = selectedNode ? getFormForNode!(selectedNode) : undefined;

  const editingField =
    selectedForm && editingFieldId
      ? getConfigurableFields(selectedForm).find((f) => f.name === editingFieldId)
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
          nodes={graph!.nodes}
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
          ) : (
            <p className="app__hint">Select a form to configure its prefill.</p>
          )}
        </div>
      </div>

      {selectedNode && editingField && modalContext && (
        <PrefillModal
          fieldTitle={editingField.title}
          providers={prefillProviders}
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
