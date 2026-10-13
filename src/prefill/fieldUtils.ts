import type { FormDefinition } from "../api/types";

export interface ConfigurableField {
  name: string;
  title: string;
  avantosType: string;
}

/** Avantos types that are actions/widgets rather than data we prefill. */
const NON_DATA_TYPES = new Set(["button"]);

/** The fields of a form that can be prefilled (or used as a prefill source). */
export function getConfigurableFields(form: FormDefinition): ConfigurableField[] {
  const properties = form.field_schema?.properties ?? {};
  return Object.entries(properties)
    .filter(([, schema]) => !NON_DATA_TYPES.has(schema.avantos_type))
    .map(([name, schema]) => ({
      name,
      title: schema.title ?? name,
      avantosType: schema.avantos_type,
    }));
}
