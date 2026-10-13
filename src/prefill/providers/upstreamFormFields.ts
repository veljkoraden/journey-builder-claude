import { getAncestorIds, getDirectDependencyIds, indexNodesById } from "../../graph/traversal";
import { getConfigurableFields } from "../fieldUtils";
import type { PrefillProvider } from "../types";

/** Provider id stored on every form-field mapping. */
export const FORM_FIELD_PROVIDER_ID = "form_field";

/**
 * Offers the fields of every upstream form as prefill sources — one group per
 * ancestor. This single provider covers both requirement 1 (direct
 * dependencies) and requirement 2 (transitive dependencies): "transitive" is
 * just an ancestor that is not a direct prerequisite. The relationship is
 * surfaced as a `badge` so the UI can distinguish them.
 */
export const upstreamFormFieldsProvider: PrefillProvider = {
  id: FORM_FIELD_PROVIDER_ID,
  label: "Form fields",
  getOptionGroups: ({ graph, targetNode, getFormForNode }) => {
    const directIds = new Set(getDirectDependencyIds(graph, targetNode.id));
    const nodesById = indexNodesById(graph);

    return getAncestorIds(graph, targetNode.id).flatMap((ancestorId) => {
      const node = nodesById.get(ancestorId);
      if (!node) return [];

      const form = getFormForNode(node);
      if (!form) return [];

      return [
        {
          id: node.id,
          label: node.data.name,
          badge: directIds.has(ancestorId) ? "direct" : "transitive",
          options: getConfigurableFields(form).map((field) => ({
            key: `${node.id}:${field.name}`,
            label: field.name,
          })),
        },
      ];
    });
  },
};
