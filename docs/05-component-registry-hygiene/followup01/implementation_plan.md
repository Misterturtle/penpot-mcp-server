# Implementation Plan: Follow-up 01

## Scope

Fix cross-file orphan detection for:

1. `query_components`
2. `list_orphan_components`

in `src/tools/component-tools.ts`.

## Design

### 1) Add shared cross-file usage inspection

- Use `postCommandGetLibraryFileReferences` with source `fileId`.
- Normalize referenced file IDs from mixed response shapes.
- For each referenced file:
  - load file with `getFile`
  - scan shapes where `componentFile === sourceFileId`
  - collect component-linked instances keyed by `componentId`
- Capture partial failures (`fileId`, `error`) for safety handling.

### 2) Merge usage in component registry summarization

- Extend summary builder inputs with `crossFileInstancesByComponentId`.
- Compute usage from combined in-file + cross-file instances.
- Preserve existing fields and add explicit context:
  - `inFileActiveInstanceCount`
  - `crossFileActiveInstanceCount`
  - `activeInstanceFileIds`
  - `activeInstanceLocations`

### 3) Safety behavior

- For `query_components` and `list_orphan_components`, fail closed if any referenced file cannot be inspected.
- Include cross-file inspection metadata in successful responses:
  - referenced file count
  - inspected file count
  - referenced file IDs

## Validation

- Run `npm run build` to verify TypeScript integrity.
- Ensure tool outputs classify cross-file-only usage as non-orphan.

## Non-Goals

- Full recursive consumer graph traversal beyond direct library references.
- Automatic cleanup/detach mutations.
