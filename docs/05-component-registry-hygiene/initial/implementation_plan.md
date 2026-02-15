# Implementation Plan: Component Registry Hygiene Utilities

## Scope

Implement MCP-level registry hygiene tools in `src/tools/component-tools.ts`:

1. `query_components`
2. `list_orphan_components`

## Design

### Shared data helpers

- Add optional regex filter parsing for `namePattern` and `pathPattern`.
- Add usage summarization over component registry entries:
  - enumerate component-linked shapes from file pages
  - split total vs active (non-main) instances
  - classify orphan/deletable status
  - include active usage samples for cleanup safety

### `query_components`

- Inputs:
  - `fileId` (required)
  - `namePattern` / `pathPattern` (optional regex filters)
  - `onlyOrphaned` (optional, default `false`)
  - `maxActiveInstances` (optional threshold)
  - `includeInstances` (optional, default `false`)
  - `sampleLimit` (optional, default `5`)
- Behavior:
  - load file and component registry
  - apply optional name/path filters
  - compute usage summary per component
  - return structured rows with counts + safe cleanup context

### `list_orphan_components`

- Inputs:
  - `fileId` (required)
  - `namePattern` / `pathPattern` (optional regex filters)
  - `maxActiveInstances` (optional, default `0`)
  - `includeInstances` (optional, default `false`)
  - `sampleLimit` (optional, default `5`)
- Behavior:
  - reuse shared usage summary
  - return components where `activeInstanceCount <= maxActiveInstances`
  - default threshold `0` returns true orphan set

## Validation

- Ensure tool registration appears in MCP tool list.
- Validate TypeScript compile with `npm run build`.
- Keep README component-tool inventory in sync.

## Non-Goals

- Automatic delete/detach operations in hygiene discovery tools.
- Cross-file global dependency traversal beyond the provided file.
