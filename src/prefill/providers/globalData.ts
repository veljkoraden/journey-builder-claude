import type { PrefillProvider } from "../types";

/** Provider id stored on every global-data mapping. */
export const GLOBAL_DATA_PROVIDER_ID = "global";

/**
 * Stand-in for "Action Properties" and "Client Organization Properties".
 * Per the brief these are mocked; swap this static config for a real fetch
 * without touching any consumer.
 */
const GLOBAL_GROUPS: ReadonlyArray<{ id: string; label: string; fields: string[] }> = [
  {
    id: "action_properties",
    label: "Action Properties",
    fields: ["action_id", "action_name", "initiated_at", "initiator_email"],
  },
  {
    id: "client_org_properties",
    label: "Client Organization Properties",
    fields: ["organization_id", "organization_name", "organization_tier"],
  },
];

export const globalDataProvider: PrefillProvider = {
  id: GLOBAL_DATA_PROVIDER_ID,
  label: "Global data",
  getOptionGroups: () =>
    GLOBAL_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      options: group.fields.map((name) => ({
        key: `${group.id}:${name}`,
        label: name,
      })),
    })),
};
