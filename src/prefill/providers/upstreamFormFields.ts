import {
  getDirectDependencyIds,
  getTransitiveDependencyIds,
  indexNodesById,
} from "../../graph/traversal";
import { getSourceFields } from "../fieldUtils";
import type { PrefillProvider } from "../types";

type DependencyScope = "direct" | "transitive";

/** Both providers share field conversion while selecting disjoint node sets. */
function createFormFieldsProvider(scope: DependencyScope): PrefillProvider {
  return {
    id: `${scope}_dependencies`,
    label: scope === "direct" ? "Direct dependencies" : "Transitive dependencies",
    getOptionGroups: ({ graph, targetNode, getFormForNode }) => {
      const nodeIds =
        scope === "direct"
          ? getDirectDependencyIds(graph, targetNode.id)
          : getTransitiveDependencyIds(graph, targetNode.id);
      const nodesById = indexNodesById(graph);

      return nodeIds.flatMap((nodeId) => {
        const node = nodesById.get(nodeId);
        if (!node || node.data.component_type !== "form") return [];
        const form = getFormForNode(node);
        if (!form) return [];
        const options = getSourceFields(form).map((field) => ({
          key: `${node.id}:${field.name}`,
          label: field.name,
        }));
        if (options.length === 0) return [];

        return [
          {
            id: node.id,
            label: node.data.name,
            badge: scope,
            options,
          },
        ];
      });
    },
  };
}

export const directFormFieldsProvider = createFormFieldsProvider("direct");
export const transitiveFormFieldsProvider = createFormFieldsProvider("transitive");
