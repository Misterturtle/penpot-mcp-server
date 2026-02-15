# Implementation Plan: Batch Mutation Tools

## Scope

Add three MCP tools:

1. `batch_instantiate_component`
2. `batch_set_shape_token_bindings`
3. `batch_delete_shape`

## Design

### Shared behavior

- Inputs accept `items` arrays of existing operation payloads.
- Add optional `continueOnError` (default `true`).
- Return item-level records with:
  - `index`
  - operation identifiers (`fileId`, `pageId`, `shapeId`/`componentId`)
  - `status` (`success`, `error`, `skipped`)
  - `error` when failed/skipped
- Include aggregate counts in response payload.

### `batch_instantiate_component`

- Reuse single instantiate logic via a helper function.
- Cache source component integrity checks per `(componentFile, componentId)` in a request-local map.
- Execute items in order and preserve partial success when failures occur.

### `batch_set_shape_token_bindings`

- Extract token-binding change construction into a helper shared with single-item handler.
- Execute each item with per-item failure isolation.
- Cache page object maps per `(fileId, pageId)` to reduce repeated file reads within a batch.
- Update cached shape state locally after successful item application.

### `batch_delete_shape`

- Execute each delete with per-item failure isolation.
- Cache page object maps per `(fileId, pageId)` for existence checks.
- Remove deleted shapes from cache to prevent duplicate-success reporting.

## Validation

- Run `npm run build` to verify TypeScript compilation.
- Confirm new tools are surfaced through the standard tool registration path.
