# Implementation Plan: Follow-up 01

## Scope

Patch component lifecycle behavior in `src/tools/component-tools.ts`:

1. Fix cross-file safety for `delete_component`.
2. Fix non-deterministic/surprising path transformation in `rename_component`.

## Design

### A) Cross-file deletion safety

- Add library reference discovery in `delete_component` using `postCommandGetLibraryFileReferences` for the source component file.
- Extract referenced file IDs from variable response shapes (string/object variants).
- For each referenced file:
  - load file data
  - scan for matching instances where `componentId` matches and `componentFile` points to the source file
- Aggregate:
  - in-source active instances (excluding main instance)
  - cross-file active instances
- Block delete when any active instances exist; return clear context payload.

### B) Stable rename path semantics

- Replace path derivation strategy to avoid global split/trim normalization.
- New behavior when `path` is omitted:
  - if no existing path: use new name
  - if existing path equals previous component name: use new name
  - if existing path ends with previous component name: replace only suffix, preserving original delimiters/spacing exactly
  - otherwise: preserve existing path unchanged

### C) Validation

- Run `npm run build`.
- Confirm no regressions in tool schema/registration.

## Non-Goals

- Forced detach/migration mode on delete.
- Full graph scan across unrelated files outside library reference discovery.
