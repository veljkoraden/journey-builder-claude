import type { PrefillProvider } from "../types";
import { directFormFieldsProvider, transitiveFormFieldsProvider } from "./upstreamFormFields";
import { globalDataProvider } from "./globalData";

/**
 * The active prefill data sources, in display order.
 *
 * Extension point:
 *   - ADD a source  -> implement a PrefillProvider, append it here.
 *   - REMOVE a source -> delete its entry.
 *   - REORDER sources -> reorder this array.
 * No other code changes are required.
 */
export const prefillProviders: PrefillProvider[] = [
  directFormFieldsProvider,
  transitiveFormFieldsProvider,
  globalDataProvider,
];
