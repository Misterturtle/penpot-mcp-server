# Follow-up Validation: Component Registry Hygiene Utilities

## Status

Issues found.

## MWE Scope

Validated:

- `query_components`
- `list_orphan_components`
- name pattern filtering
- orphan/usage classification

Test setup:

- Source file/page: `Fuel UI Kit (Library)` / `MCP Validation Source` (`a29ddaaf-0d36-438c-a505-5bf971057923`)
- Created components:
  - `VAL / FR5 / Used Component` (`ede67361-1fa1-4a12-9c26-1e5ee42e9665`)
  - `VAL / FR5 / Orphan Component` (`04e5a55c-c76e-4556-9b82-9b465b590ad4`)
- Cross-file instance created in `Tokens starter kit`.

## Current Behavior

With only cross-file usage present, both components were reported as orphaned (`activeInstanceCount = 0`).
After adding an in-file instance, the used component was correctly marked non-orphaned.

## Expected Behavior

For library maintenance, orphan/usage analysis should count active instances across relevant linked/consumer files, not only within the current source file.

## Repro Notes

The utilities are functional for in-file usage visibility, but cross-file visibility appears missing, which limits cleanup safety for shared libraries.
