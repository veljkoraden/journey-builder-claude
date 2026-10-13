import type { GraphNode } from "../api/types";

interface FormListProps {
  nodes: GraphNode[];
  selectedNodeId?: string;
  onSelect: (nodeId: string) => void;
}

/** The list of forms in the blueprint. Clicking one opens its prefill editor. */
export function FormList({ nodes, selectedNodeId, onSelect }: FormListProps) {
  const sorted = [...nodes].sort((a, b) =>
    a.data.name.localeCompare(b.data.name),
  );

  return (
    <nav className="form-list" aria-label="Forms">
      <h2 className="form-list__title">Forms</h2>
      <ul className="form-list__items">
        {sorted.map((node) => (
          <li key={node.id}>
            <button
              type="button"
              className={
                "form-list__item" +
                (node.id === selectedNodeId ? " form-list__item--active" : "")
              }
              onClick={() => onSelect(node.id)}
              aria-pressed={node.id === selectedNodeId}
            >
              {node.data.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
