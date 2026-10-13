/**
 * Types for the `action-blueprint-graph-get` response.
 * Mirrors the shape returned by the mock server's graph.json.
 */

/** Avantos-specific widget type. Open string union so unknown types don't break parsing. */
export type AvantosType =
  | "button"
  | "checkbox-group"
  | "object-enum"
  | "short-text"
  | "multi-select"
  | "multi-line-text"
  | (string & {});

/** JSON-schema-like description of a single form field. */
export interface FieldSchemaProperty {
  avantos_type: AvantosType;
  type: string;
  title?: string;
  format?: string;
  items?: { enum?: string[]; type?: string };
  enum?: unknown;
  uniqueItems?: boolean;
}

export interface FormFieldSchema {
  type: "object";
  properties: Record<string, FieldSchemaProperty>;
  required?: string[];
}

/** A reusable form definition. Referenced by nodes via `component_id`. */
export interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  is_reusable?: boolean;
  field_schema: FormFieldSchema;
  ui_schema?: unknown;
  dynamic_field_config?: Record<string, unknown>;
}

/** Per-node metadata. `prerequisites` lists the upstream node ids this node depends on. */
export interface NodeData {
  id: string;
  component_key: string;
  component_type: string;
  component_id: string;
  name: string;
  prerequisites: string[];
  permitted_roles?: string[];
  input_mapping?: Record<string, unknown>;
  sla_duration?: { number: number; unit: string };
  approval_required?: boolean;
  approval_roles?: string[];
}

/** A node in the DAG. `id` is the node id (e.g. "form-0f58384c-..."). */
export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

/** A directed edge: `source` is a prerequisite of `target`. */
export interface GraphEdge {
  source: string;
  target: string;
}

export interface BlueprintGraph {
  $schema?: string;
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  forms: FormDefinition[];
  branches?: unknown[];
  triggers?: unknown[];
}
