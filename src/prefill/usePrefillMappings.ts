import { useCallback, useState } from "react";
import type { FieldPrefillMap, PrefillSource } from "./types";

/** nodeId -> (targetFieldId -> chosen source). */
type AllMappings = Record<string, FieldPrefillMap>;

export interface PrefillMappingsApi {
  getFieldMap: (nodeId: string) => FieldPrefillMap;
  setMapping: (nodeId: string, fieldId: string, source: PrefillSource) => void;
  clearMapping: (nodeId: string, fieldId: string) => void;
}

/**
 * In-memory store for prefill selections, keyed by node and field.
 * Kept deliberately simple; could be swapped for a persisted store (the public
 * API would not change).
 */
export function usePrefillMappings(): PrefillMappingsApi {
  const [mappings, setMappings] = useState<AllMappings>({});

  const getFieldMap = useCallback(
    (nodeId: string): FieldPrefillMap => mappings[nodeId] ?? {},
    [mappings],
  );

  const setMapping = useCallback(
    (nodeId: string, fieldId: string, source: PrefillSource) => {
      setMappings((prev) => ({
        ...prev,
        [nodeId]: { ...(prev[nodeId] ?? {}), [fieldId]: source },
      }));
    },
    [],
  );

  const clearMapping = useCallback((nodeId: string, fieldId: string) => {
    setMappings((prev) => {
      const next = { ...(prev[nodeId] ?? {}) };
      delete next[fieldId];
      return { ...prev, [nodeId]: next };
    });
  }, []);

  return { getFieldMap, setMapping, clearMapping };
}
