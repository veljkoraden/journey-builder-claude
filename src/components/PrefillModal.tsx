import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PrefillProvider, PrefillProviderContext, PrefillSource } from "../prefill/types";

import { PrefillSourceGroup } from "./PrefillSourceGroup";

interface PrefillModalProps {
  /** Display name of the field being configured (e.g. "Email"). */
  fieldTitle: string;
  providers: readonly PrefillProvider[];
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
 * groups from every enabled provider, so new data sources appear here
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
  const [draft, setDraft] = useState<{ providerId: string; groupId: string; optionKey: string }>();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const searchId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    searchRef.current?.focus();
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        searchRef.current?.focus();
      }
    };
    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("focusin", containFocus);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

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

  // Resolve against current options so a removed source cannot be confirmed.
  const selectedGroup = groups.find((group) =>
    group.providerId === draft?.providerId && group.groupId === draft.groupId,
  );
  const selectedOption = selectedGroup?.options.find((option) => option.key === draft?.optionKey);
  const selection = selectedGroup && selectedOption ? {
    providerId: selectedGroup.providerId,
    optionKey: selectedOption.key,
    label: `${selectedGroup.label}.${selectedOption.label}`,
  } : undefined;

  return (
    <div className="modal-backdrop" role="presentation" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
          if (event.key !== "Tab") return;
          const controls = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)") ?? [],
          ).filter((element) => !element.closest("[hidden]"));
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id={titleId} className="modal__title">Select data element to map {fieldTitle}</h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <label htmlFor={searchId} className="modal__search-label">Search available data</label>
        <input
          id={searchId}
          ref={searchRef}
          type="search"
          className="modal__search"
          placeholder="Search fields"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="modal__groups">
          {filtered.length === 0 && (
            <p className="modal__empty" role="status">
              {providers.length === 0
                ? "No prefill sources enabled."
                : groups.length === 0
                  ? "No available data elements for this form."
                  : "No matching data elements."}
            </p>
          )}
          {filtered.map((group) => (
            <PrefillSourceGroup
              key={JSON.stringify([group.providerId, group.groupId])}
              group={{ ...group, id: group.groupId }}
              searching={query.trim().length > 0}
              selectedKey={draft?.providerId === group.providerId && draft.groupId === group.groupId
                ? draft.optionKey : undefined}
              onChoose={(option) => setDraft({
                providerId: group.providerId,
                groupId: group.groupId,
                optionKey: option.key,
              })}
            />
          ))}
        </div>
        <p className="modal__selection" aria-live="polite">
          {selection ? `Selected: ${selection.label}` : "Choose a source, then select to apply."}
        </p>
        <footer className="modal__footer">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" disabled={!selection} onClick={() => {
            if (selection) onSelect(selection);
          }}>Select</button>
        </footer>
      </div>
    </div>
  );
}
