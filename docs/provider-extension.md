# Add a prefill source

A provider prepares named groups of choices. It does not render UI, save mappings,
or fetch submitted values. Existing providers can be selected using configuration;
a new behavior requires a new implementation and a build.

## 1. Implement the provider

Create `src/prefill/providers/tenantSettings.ts`:

```ts
import type { PrefillProvider } from "../types";

export const tenantSettingsProvider: PrefillProvider = {
  id: "tenant_settings",
  label: "Tenant settings",
  getOptionGroups: () => [
    {
      id: "tenant",
      label: "Tenant Settings",
      options: [
        { key: "tenant:locale", label: "locale" },
        { key: "tenant:timezone", label: "timezone" },
      ],
    },
  ],
};
```

This is an example, not an additional built-in source. Enable it only after adding
and registering its implementation. A smaller tenant example is exercised in
`src/prefill/configuration.integration.test.tsx`.

For graph-aware sources, `getOptionGroups(context)` receives the graph, selected
node, and `getFormForNode` resolver. Keep traversal/eligibility inside the provider
or shared graph utilities. The picker should not know which provider it renders.

## 2. Register the implementation

In `src/prefill/providers/index.ts`, add the import and array entry:

```ts
import { tenantSettingsProvider } from "./tenantSettings";

// Keep existing imports and providers.
export const availablePrefillProviders: readonly PrefillProvider[] = [
  directFormFieldsProvider,
  transitiveFormFieldsProvider,
  globalDataProvider,
  tenantSettingsProvider,
];
```

Registration makes the provider available; it does not activate it. Duplicate
provider IDs are rejected by configuration resolution.

## 3. Enable and order it

Edit `public/prefill-config.json`:

```json
{
  "enabledSourceIds": ["global", "tenant_settings", "direct_dependencies"]
}
```

Reload development or build/deploy the new implementation. The modal will show
those categories in that order. Afterwards, editing the deployed
`dist/prefill-config.json` changes activation without rebuilding JavaScript.
Do not add unknown IDs to production configuration before deploying their code.

## Identity rules

- Provider IDs are unique, stable, case-sensitive strings.
- Group IDs are unique within a provider; labels are presentation only.
- Option keys are stable and unique throughout a provider, even across groups.
- Different providers can reuse keys because mapping identity includes provider ID.
- Form options use node ID plus field key, not form-template ID or display title.
- Labels can change without changing identity. Avoid secrets or submitted values
  in labels or configuration; everything here is visible to the browser.

Choosing locale and confirming creates this mapping value:

```json
{
  "providerId": "tenant_settings",
  "optionKey": "tenant:locale",
  "label": "Tenant Settings.locale"
}
```

The mapping store associates it with the selected target node and field. It stores
metadata, not the actual locale value. No changes to modal, editor, resolver,
configuration schema, or mapping-store logic should be needed.

## Test the extension

Use the existing extension integration test as a model:

1. Register your test provider with the built-ins and resolve configuration for it.
2. Verify it is absent when registered but not enabled.
3. Verify it works alone and in a reordered combination with existing sources.
4. Expand the group, choose an option, and assert the mapping remains unchanged
   before Select. Confirm and assert exact provider ID, key, and display label.
5. Add provider-specific eligibility tests if the provider uses the graph.
6. Run `npm run test:run` and `npm run build`.

An empty option list must not produce selectable fake data. Providers are expected
to return valid groups; arbitrary provider output is not runtime-schema-validated.

## Limits and future work

`getOptionGroups` is synchronous. Do not initiate asynchronous requests during
render or return a Promise through this interface. A future remote source should
load data before rendering or deliberately extend the contract with loading/error
states and tests. That asynchronous design is outside this implementation.

Configuration controls available choices, not access permissions. Providers must
not be used as an authorization boundary. Mappings reset on page reload; persisted
mappings, migration policies, and actual value resolution would require new work.
