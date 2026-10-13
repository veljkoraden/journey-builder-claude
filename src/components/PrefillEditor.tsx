import type { FormDefinition, GraphNode } from "../api/types";
import { getTargetFields } from "../prefill/fieldUtils";
import type { FieldPrefillMap } from "../prefill/types";
import { PrefillField } from "./PrefillField";

interface PrefillEditorProps {
  node: GraphNode;
  form: FormDefinition;
  fieldMap: FieldPrefillMap;
  onPickField: (fieldId: string) => void;
  onClearField: (fieldId: string) => void;
}

/** Lists a form's fields and their current prefill configuration. */
export function PrefillEditor({
  node,
  form,
  fieldMap,
  onPickField,
  onClearField,
}: PrefillEditorProps) {
  const fields = getTargetFields(form);

  return (
    <section className="prefill-editor" aria-label={`Prefill for ${node.data.name}`}>
      <h2 className="prefill-editor__title">{node.data.name}</h2>
      <h3 className="prefill-editor__heading">Prefill</h3>
      <p className="prefill-editor__subtitle">Prefill fields for this form</p>
      {fields.length === 0 && <p>No configurable fields in this form.</p>}
      <ul className="prefill-editor__fields">
        {fields.map((field) => (
          <PrefillField
            key={field.name}
            field={field}
            source={fieldMap[field.name]}
            onOpen={() => onPickField(field.name)}
            onClear={() => onClearField(field.name)}
          />
        ))}
      </ul>
    </section>
  );
}
