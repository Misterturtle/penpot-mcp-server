# Implementation Plan: Follow-up 01

## Scope

Patch `duplicate_page` behavior in `src/tools/page-tools.ts` to use a valid `add-page` payload shape.

## Design

### Duplicate payload fix

- Keep current duplication mechanics (deep clone + ID remap + deterministic naming).
- Continue assigning `duplicatedPagePayload.name` and `duplicatedPagePayload.id`.
- Change `applyChanges` payload from:
  - `{ type: 'add-page', id, name, page }`
    to:
  - `{ type: 'add-page', page }`

### Validation

- Run `npm run build` to ensure compile integrity.
- Update feature work log with follow-up findings and applied fix.

## Non-Goals

- Redesigning duplicate naming semantics.
- Altering `rename_page` or `delete_page` behavior.
