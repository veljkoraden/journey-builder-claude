import type { PrefillProvider } from "../types";
import { directFormFieldsProvider, transitiveFormFieldsProvider } from "./upstreamFormFields";
import { globalDataProvider } from "./globalData";

/** Available implementations. Runtime configuration selects their order and activation. */
export const availablePrefillProviders: readonly PrefillProvider[] = [
  directFormFieldsProvider,
  transitiveFormFieldsProvider,
  globalDataProvider,
];
