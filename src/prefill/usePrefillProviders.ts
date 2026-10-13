import { useEffect, useState } from "react";
import { loadPrefillProviders } from "./configuration";
import { availablePrefillProviders } from "./providers";
import type { PrefillProvider } from "./types";

type ProviderState =
  | { status: "loading" }
  | { status: "ready"; providers: PrefillProvider[] }
  | { status: "error"; error: Error };

/** Load once per mount. Reload the page to apply deployment configuration edits. */
export function usePrefillProviders(): ProviderState {
  const [state, setState] = useState<ProviderState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    loadPrefillProviders(availablePrefillProviders, controller.signal)
      .then((providers) => {
        if (!controller.signal.aborted) setState({ status: "ready", providers });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const error = cause instanceof Error
          ? cause
          : new Error("Could not load prefill configuration.");
        setState({ status: "error", error });
      });
    return () => controller.abort();
  }, []);

  return state;
}
