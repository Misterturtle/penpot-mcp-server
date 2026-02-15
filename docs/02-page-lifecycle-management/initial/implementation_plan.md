# Implementation Plan: Page Lifecycle Tools

## Scope

Add three MCP tools in `src/tools/page-tools.ts`:

1. `rename_page`
2. `delete_page`
3. `duplicate_page`

## Design

### Shared helpers

- Normalize page index access (`pagesIndex` / `pages-index`) from file payloads.
- Resolve page ordering and naming consistently for deterministic responses.
- Add guard checks for protected deletion scenarios.

### `rename_page`

- Inputs:
  - `fileId` (required)
  - `pageId` (required)
  - `name` (required)
- Behavior:
  - Validate page exists.
  - Validate name is non-empty.
  - Apply `mod-page` with explicit error propagation.

### `delete_page`

- Inputs:
  - `fileId` (required)
  - `pageId` (required)
- Behavior:
  - Validate page exists.
  - Block deleting final remaining page.
  - Block deleting pages that host component main instances.
  - Apply `del-page`.

### `duplicate_page`

- Inputs:
  - `fileId` (required)
  - `pageId` (required)
  - `name` (optional)
- Behavior:
  - Validate source page exists.
  - Compute deterministic default naming when `name` is omitted:
    - `<source> (Copy)`
    - `<source> (Copy N)` for collisions
  - Clone page payload while remapping page/object identifiers.
  - Submit a valid `add-page` payload shape accepted by Penpot backend.

## Validation

- Extend integration flow in `test-tools.ts` to cover rename/duplicate/delete page lifecycle behavior.
- Run `npm run build`.
- Confirm README tool inventory documents all page lifecycle tools.

## Non-Goals

- Cross-file graph reconciliation for references to deleted pages.
- New backend API endpoints beyond current `update-file` primitives.
