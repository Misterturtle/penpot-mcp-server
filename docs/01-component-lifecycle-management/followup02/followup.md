# Follow-up Validation: Component Lifecycle Management (Follow-up 02)

## Status

Issues found (partial pass).

## MWE Scope

Validated:

- `list_component_instances`
- `rename_component`
- `delete_component`

Test setup:

- Source file/page: `Fuel UI Kit (Library)` / `VAL FU2 Source` (`6565b3db-4324-45be-a114-ff90eca5063c`)
- Target file/page: `Tokens starter kit` / `VAL FU2 Target` (`cb4c00d6-5013-40e2-a168-1086f8467a1e`)

## Current Behavior

What works:

1. Cross-file usage blocking in `delete_component` is now present.
2. `list_component_instances` returns cross-file instance records.

Remaining issues:

1. `rename_component` path handling is not preserving expected path-prefix semantics.
   - Call: rename component `2e517722-8059-4f3d-b5bd-f30caf8ade57` to `Lifecycle Renamed`
   - Returned `path`: `Lifecycle Renamed` (prefix dropped)
2. `delete_component` can report stale references immediately after deleting the last instance.
   - First delete attempt failed and referenced a just-deleted shape.
   - Immediate second retry succeeded with no additional changes.
3. `list_component_instances(includeMainInstance: true)` still returns `instances: []` for a component with a valid `mainInstanceId`.

## Expected Behavior

1. `rename_component` should preserve existing path prefix unless explicit `path` override is provided.
2. `delete_component` should deterministically succeed right after the final instance is deleted (no stale reference window).
3. `includeMainInstance: true` should include the main instance root entry in `instances`.

## Repro Notes

- Primary component: `2e517722-8059-4f3d-b5bd-f30caf8ade57`
- Main-instance check component: `94a29b53-b6f0-4666-bbd7-ae7614e6b048`
