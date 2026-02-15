# MWE Retry Log (`instantiate_component`)

Date: 2026-02-15

## Scope

Re-test whether cross-file `instantiate_component` now materializes nested children for composite components.

## Setup

- Source file (library): `Fuel UI Kit (Library)` (`98b186a7-aee9-8016-8007-92c03d0ab57d`)
- Target file: `Tokens starter kit` (`98b186a7-aee9-8016-8007-92a896062ef2`)
- New target page: `MCP Instantiate MWE Retry` (`58123df0-da7b-481f-a50b-8a6b7231a182`)

## Actions Performed

1. Created fresh target page `MCP Instantiate MWE Retry`.
2. Instantiated primitive component:
   - `Dark / Button / Log / Default` (`7bc80dc1-0f41-408f-b53d-2a2d7f130b05`)
   - Instance ID: `6caeacbd-0fee-8019-8007-93e0f332aa91`
3. Instantiated existing composite component:
   - `Dark / Button / Log / Default / Composite` (`2d092693-9cce-444a-9d07-446a613547f8`)
   - Instance ID: `6caeacbd-0fee-8019-8007-93e0f35e6a61`
4. Instantiated fresh composite-from-group component:
   - `MWE / Source / Composite Group` (`c34a3b26-f2f7-41fd-bfa2-ca30544fee53`)
   - Instance ID: `6caeacbd-0fee-8019-8007-93e0f36c3ca8`
5. Instantiated fresh composite-from-frame component:
   - `MWE / Source / Frame` (`e4ed5738-8bfb-4c28-8b44-9e9137cd5ea7`)
   - Instance ID: `6caeacbd-0fee-8019-8007-93e0f35124a8`
6. Added text labels on page to mark each test region.
7. Queried resulting shapes and searched for expected child text layers.

## Observed Results

- Primitive instance appears as a `rect` with expected visual properties.
- Existing composite instance appears as a `group` shell only.
- Fresh group composite appears as a `group` shell only.
- Fresh frame composite appears as a `frame` background only.
- Expected nested text layers are not present on the target page:
  - `Dark / Button / Log / Default / Label` -> not found
  - `MWE / Source / Label` -> not found
  - `MWE / Source / Frame Label` -> not found

## Verdict

Fix is still **not functional** for composite/container component instantiation.

- `instantiate_component` works for primitive components.
- Nested children are still dropped for composite components in cross-file instantiation.
