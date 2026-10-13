import { useEffect, useState } from "react";
import { fetchActionBlueprintGraph } from "./client";
import type { BlueprintGraph } from "./types";

export type BlueprintGraphState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; graph: BlueprintGraph };

/** Loads the blueprint graph once on mount and exposes loading/error/ready states. */
export function useBlueprintGraph(): BlueprintGraphState {
  const [state, setState] = useState<BlueprintGraphState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetchActionBlueprintGraph(controller.signal)
      .then((graph) => setState({ status: "ready", graph }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error });
      });
    return () => controller.abort();
  }, []);

  return state;
}
