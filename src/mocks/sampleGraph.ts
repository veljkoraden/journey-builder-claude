import type { BlueprintGraph } from "../api/types";

/**
 * Trimmed copy of the mock server's graph.json, used as a fixture in tests.
 * DAG: A -> (B, C); B -> D; C -> E; (D, E) -> F.
 * So for Form D: B is a direct dependency and A is transitive.
 */
const node = (
  id: string,
  name: string,
  componentId: string,
  prerequisites: string[],
) => ({
  id,
  type: "form",
  position: { x: 0, y: 0 },
  data: {
    id: `bp_c_${id}`,
    component_key: id,
    component_type: "form",
    component_id: componentId,
    name,
    prerequisites,
    permitted_roles: [],
    input_mapping: {},
    sla_duration: { number: 0, unit: "minutes" },
    approval_required: false,
    approval_roles: [],
  },
});

const FORM_1 = "f_01jk7ap2r3ewf9gx6a9r09gzjv";
const FORM_2 = "f_01jk7awbhqewgbkbgk8rjm7bv7";
const FORM_3 = "f_01jk7aygnqewh8gt8549beb1yc";

const FORM_A = "form-47c61d17-62b0-4c42-8ca2-0eff641c9d88";
const FORM_B = "form-a4750667-d774-40fb-9b0a-44f8539ff6c4";
const FORM_C = "form-7c26f280-7bff-40e3-b9a5-0533136f52c3";
const FORM_D = "form-0f58384c-4966-4ce6-9ec2-40b96d61f745";
const FORM_E = "form-e15d42df-c7c0-4819-9391-53730e6d47b3";
const FORM_F = "form-bad163fd-09bd-4710-ad80-245f31b797d5";

const fieldSchema = {
  type: "object" as const,
  properties: {
    button: { avantos_type: "button", title: "Button", type: "object" },
    dynamic_checkbox_group: {
      avantos_type: "checkbox-group",
      type: "array",
      items: { enum: ["foo", "bar", "foobar"], type: "string" },
      uniqueItems: true,
    },
    dynamic_object: { avantos_type: "object-enum", title: "Dynamic Object", type: "object" },
    email: { avantos_type: "short-text", format: "email", title: "Email", type: "string" },
    id: { avantos_type: "short-text", title: "ID", type: "string" },
    name: { avantos_type: "short-text", title: "Name", type: "string" },
    notes: { avantos_type: "multi-line-text", title: "Notes", type: "string" },
  },
  required: ["id", "name", "email"],
};

const form = (id: string) => ({
  id,
  name: "test form",
  description: "test",
  is_reusable: false,
  field_schema: fieldSchema,
});

export const sampleGraph: BlueprintGraph = {
  id: "bp_01jk766tckfwx84xjcxazggzyc",
  tenant_id: "1",
  name: "Onboard Customer 0",
  description: "Automated test action",
  category: "Category 4",
  nodes: [
    node(FORM_A, "Form A", FORM_1, []),
    node(FORM_B, "Form B", FORM_2, [FORM_A]),
    node(FORM_C, "Form C", FORM_3, [FORM_A]),
    node(FORM_D, "Form D", FORM_1, [FORM_B]),
    node(FORM_E, "Form E", FORM_1, [FORM_C]),
    node(FORM_F, "Form F", FORM_1, [FORM_D, FORM_E]),
  ],
  edges: [
    { source: FORM_A, target: FORM_B },
    { source: FORM_A, target: FORM_C },
    { source: FORM_B, target: FORM_D },
    { source: FORM_C, target: FORM_E },
    { source: FORM_D, target: FORM_F },
    { source: FORM_E, target: FORM_F },
  ],
  forms: [form(FORM_1), form(FORM_2), form(FORM_3)],
  branches: [],
  triggers: [],
};

export const NODE_IDS = {
  FORM_A,
  FORM_B,
  FORM_C,
  FORM_D,
  FORM_E,
  FORM_F,
};
