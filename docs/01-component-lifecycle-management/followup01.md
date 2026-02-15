# Follow-up Validation: Component Lifecycle Management

## Status

Issues found.

## MWE Scope

Validated:

- `list_component_instances`
- `rename_component`
- `delete_component`

Test setup:

- Source file/page: `Fuel UI Kit (Library)` / `MCP Validation Source` (`a29ddaaf-0d36-438c-a505-5bf971057923`)
- Target file/page: `Tokens starter kit` / `MCP Validation Target` (`ffb9fcab-bfbf-4bac-aa5e-17d419b4ef68`)

## Current Behavior

1. `list_component_instances` works and correctly reports cross-file instance usage.
2. `rename_component` works, but returned `path` looked unexpectedly transformed:
   - `VAL/FR1/VAL / FR1 / Lifecycle Component / Renamed`
3. `delete_component` allowed deletion even while an active instance existed in another file.
4. After deletion, cross-file instance remained and still reported as linked to the deleted component ID.

## Expected Behavior

1. Deleting a component with active instances should either:
   - fail with clear usage context, or
   - require explicit force semantics and return a deterministic detach/migration result.
2. Rename path behavior should preserve expected path semantics without surprising duplication/transformation.

## Repro Notes

- Component tested: `62d7cfd6-aaff-400d-9040-9c947de9b603`
- Instance remained at shape: `6caeacbd-0fee-8019-8007-94071d3b4473` after component deletion.
