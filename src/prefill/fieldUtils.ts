import type { FormDefinition } from "../api/types";

export interface ConfigurableField {
  name: string;
  title: string;
  avantosType: string;
}

/** Avantos types that are actions/widgets rather than data we prefill. */
const NON_DATA_TYPES = new Set(["button"]);

/** Source options include every schema field, including button fields. */
export function getSourceFields(form: FormDefinition): ConfigurableField[] {
  const properties = form.field_schema?.properties ?? {};
  return Object.entries(properties).map(([name, schema]) => ({
    name,
    title: schema.title ?? name,
    avantosType: schema.avantos_type,
  }));
}

/** Buttons are actions, so they are excluded only from editable target fields. */
export function getTargetFields(form: FormDefinition): ConfigurableField[] {
  return getSourceFields(form).filter(
    (field) => !NON_DATA_TYPES.has(field.avantosType),
  );
}
