# Implementation Plan: Page Lifecycle Tools

## Scope

Add three MCP tools in `src/tools/page-tools.ts`:

1. `rename_page`
2. `delete_page`
3. `duplicate_page`

## Design

### Shared helpers

- Normalize page index lookup from file data (`pagesIndex` and `pages-index`).
- Normalize component lookup for delete protection checks.
- Build stable page order/name helpers for deterministic behavior.
- Implement deep ID remapping for page duplication payloads.

### `rename_page`

- Inputs:
  - `fileId` (required)
  - `pageId` (required)
  - `name` (required)
- Behavior:
  - Validate target page exists.
  - Validate non-empty new name.
  - No-op with explicit response if name unchanged.
  - Apply `mod-page` change.

### `delete_page`

- Inputs:
  - `fileId` (required)
  - `pageId` (required)
- Behavior:
  - Validate page exists.
  - Explicitly block deleting the final remaining page.
  - Explicitly block deleting pages hosting component main instances (protected-page condition).
  - Apply `del-page` change.

### `duplicate_page`

- Inputs:
  - `fileId` (required)
  - `pageId` (required)
  - `name` (optional)
- Behavior:
  - Validate source page exists.
  - Compute deterministic default name when `name` absent:
    - `<source> (Copy)`
    - `<source> (Copy N)` for collisions
  - Clone source page payload and remap page/object IDs to new UUIDs.
  - Apply `add-page` with `{ id, name, page }`.

## Validation

- Extend `test-tools.ts` page-operation sequence to cover add/rename/duplicate/delete flows.
- Run `npm run build` to verify TypeScript integrity.
- Update README page-management tool inventory.

## Non-Goals

- Introducing backend API endpoints outside existing `update-file` changes.
- Automatic cross-file migration of references for deleted pages.
