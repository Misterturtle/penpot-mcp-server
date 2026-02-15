# Implementation Plan: Component Registry Hygiene Utilities

## Scope

Implement MCP-level registry hygiene utilities in `src/tools/component-tools.ts`:

1. `query_components` for pattern filtering and usage visibility
2. `list_orphan_components` for orphan and low-use candidate detection

## Design

### Shared helpers

- Add safe regex compilation for optional `namePattern` / `pathPattern` filters.
- Add a registry summarizer that:
  - iterates `file.data.components`
  - computes per-component instance usage from page object linkage
  - returns normalized cleanup-oriented rows (counts, main instance metadata, sample references)

### `query_components`

- Inputs:
  - `fileId` (required)
  - `namePattern` (optional regex string)
  - `pathPattern` (optional regex string)
  - `onlyOrphaned` (optional, default `false`)
  - `maxActiveInstances` (optional threshold for low-use candidates)
  - `includeInstances` (optional, default `false`)
  - `sampleLimit` (optional, default `5`)
- Behavior:
  - load file + component registry
  - apply path/name pattern filters
  - compute active instance count (`non-main` instances)
  - return cleanup-safe context: orphan status, deletable-now signal, main-instance ids/pages, and sample active references

### `list_orphan_components`

- Inputs:
  - `fileId` (required)
  - `namePattern` / `pathPattern` (optional filters)
  - `maxActiveInstances` (optional, default `0`)
  - `includeInstances` (optional, default `false`)
  - `sampleLimit` (optional, default `5`)
- Behavior:
  - reuse shared summarizer + filters
  - return only components where `activeInstanceCount <= maxActiveInstances`
  - default behavior (`maxActiveInstances=0`) yields true orphan set

## Validation

- Extend `test-tools.ts` component section with:
  - `query_components` invocation and payload assertions
  - `list_orphan_components` invocation and payload assertions
- Update `README.md` component tool inventory.
- Run `npm run build`.

## Non-Goals

- Cross-file global orphan analysis across all consuming files/libraries.
- Automatic cleanup mutations (delete/detach) as part of discovery tools.
