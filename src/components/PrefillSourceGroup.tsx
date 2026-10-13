import { useId, useState } from "react";
import type { PrefillOption, PrefillOptionGroup } from "../prefill/types";

interface PrefillSourceGroupProps {
  group: PrefillOptionGroup;
  searching: boolean;
  selectedKey?: string;
  onChoose: (option: PrefillOption) => void;
}

/** A disclosure of provider-neutral options. Search reveals matching fields. */
export function PrefillSourceGroup({ group, searching, selectedKey, onChoose }: PrefillSourceGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const optionsId = useId();
  const open = searching || expanded;

  return (
    <fieldset className="modal__group">
      <legend className="modal__group-label">
        <button
          type="button"
          className="modal__group-toggle"
          aria-expanded={open}
          aria-controls={optionsId}
          onClick={() => setExpanded(!expanded)}
          disabled={searching}
        >
          <span aria-hidden="true">{open ? "▾" : "▸"}</span> {group.label}
          {group.badge && <span className="modal__badge">{group.badge}</span>}
        </button>
      </legend>
      <ul id={optionsId} className="modal__options" hidden={!open}>
        {group.options.map((option) => (
          <li key={option.key}>
            <button
              type="button"
              className="modal__option"
              aria-pressed={selectedKey === option.key}
              onClick={() => onChoose(option)}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
