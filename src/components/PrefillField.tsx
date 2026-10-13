import { useRef } from "react";
import type { ConfigurableField } from "../prefill/fieldUtils";
import type { PrefillSource } from "../prefill/types";

interface PrefillFieldProps {
  field: ConfigurableField;
  source?: PrefillSource;
  onOpen: () => void;
  onClear: () => void;
}

/**
 * One row in the prefill editor. Shows the chosen source with a clear (X)
 * button when configured, or an empty, clickable row when not.
 */
export function PrefillField({ field, source, onOpen, onClear }: PrefillFieldProps) {
  const configured = Boolean(source);
  const mainRef = useRef<HTMLButtonElement>(null);

  return (
    <li className={"prefill-field" + (configured ? " prefill-field--set" : "")}>
      <button ref={mainRef} type="button" className="prefill-field__main" onClick={onOpen}>
        <span className="prefill-field__name">{field.title}{configured ? ":" : ""}</span>
        {configured ? (
          <span className="prefill-field__value">{source?.label}</span>
        ) : (
          <span className="prefill-field__placeholder">No prefill configured</span>
        )}
      </button>

      {configured && (
        <button
          type="button"
          className="prefill-field__clear"
          aria-label={`Clear prefill for ${field.title}`}
          onClick={() => {
            mainRef.current?.focus();
            onClear();
          }}
        >
          ×
        </button>
      )}
    </li>
  );
}
