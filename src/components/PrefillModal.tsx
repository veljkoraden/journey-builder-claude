import { useMemo, useState } from "react";
import type { PrefillProvider, PrefillProviderContext, PrefillSource } from "../prefill/types";

interface PrefillModalProps {
  /** Display name of the field being configured (e.g. "Email"). */
  fieldTitle: string;
  providers: PrefillProvider[];
  context: PrefillProviderContext;
  onSelect: (source: PrefillSource) => void;
  onClose: () => void;
}

/** A flattened, provider-tagged option group ready to render. */
interface RenderableGroup {
  providerId: string;
  groupId: string;
  label: string;
  badge?: string;
  options: { key: string; label: string }[];
}

/**
 * Modal for choosing a prefill source for a single field. Aggregates option
 * groups from EVERY registered provider, so new data sources appear here
 * automatically.
 */
export function PrefillModal({
  fieldTitle,
  providers,
  context,
  onSelect,
  onClose,
}: PrefillModalProps) {
  const [query, setQuery] = useState("");

  const groups = useMemo<RenderableGroup[]>(
    () =>
      providers.flatMap((provider) =>
        provider.getOptionGroups(context).map((group) => ({
          providerId: provider.id,
          groupId: group.id,
          label: group.label,
          badge: group.badge,
          options: group.options,
        })),
      ),
    [providers, context],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (option) =>
            option.label.toLowerCase().includes(needle) ||
            group.label.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, query]);

  function handleSelect(group: RenderableGroup, option: { key: string; label: string }) {
    onSelect({
      providerId: group.providerId,
      optionKey: option.key,
      label: `${group.label}.${option.label}`,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Select data element to map ${fieldTitle}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2 className="modal__title">Select data element</h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <input
          type="search"
          className="modal__search"
          placeholder="Search fields"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />

        <div className="modal__groups">
          {filtered.length === 0 && (
            <p className="modal__empty">No matching data elements.</p>
          )}
          {filtered.map((group) => (
            <fieldset key={`${group.providerId}:${group.groupId}`} className="modal__group">
              <legend className="modal__group-label">
                {group.label}
                {group.badge && <span className="modal__badge">{group.badge}</span>}
              </legend>
              <ul className="modal__options">
                {group.options.map((option) => (
                  <li key={option.key}>
                    <button
                      type="button"
                      className="modal__option"
                      onClick={() => handleSelect(group, option)}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>
      </div>
    </div>
  );
}
