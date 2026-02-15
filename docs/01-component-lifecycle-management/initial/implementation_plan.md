# Implementation Plan: Component Lifecycle Tools

## Scope

Add three MCP tools in `src/tools/component-tools.ts`:

1. `rename_component`
2. `delete_component`
3. `list_component_instances`

## Design

### Shared data helpers

- Add shape/component field accessors that support camelCase and kebab-case payload variants:
  - `componentId` / `component-id`
  - `componentFile` / `component-file`
  - `mainInstance` / `main-instance`
  - `componentRoot` / `component-root`
- Add a component instance collector that scans all page objects and returns normalized instance metadata with file/page context.

### `list_component_instances`

- Inputs:
  - `fileId` (required)
  - `componentId` (required)
  - `componentFile` (optional filter)
  - `includeMainInstance` (optional, default `true`)
- Behavior:
  - Load file data
  - Enumerate all matching component-linked shapes
  - Classify main instance vs regular instances when component definition is present
  - Return structured JSON rows with file/page/shape context

### `rename_component`

- Inputs:
  - `fileId` (required)
  - `componentId` (required)
  - `name` (required)
  - `path` (optional)
- Behavior:
  - Validate component exists
  - Compute target path:
    - explicit `path` if provided
    - else preserve path prefix and replace terminal segment with new `name` when possible
    - else fall back to `name`
  - Apply `mod-component` change

### `delete_component`

- Inputs:
  - `fileId` (required)
  - `componentId` (required)
- Behavior:
  - Validate component exists
  - Enumerate instances excluding the main instance root
  - If references remain, fail with explicit error text and serialized instance context
  - If no references remain, apply `del-component`

## Validation

- Run `npm run build` to verify TypeScript compilation and exported tool registration integrity.
- Update README component section to include the new lifecycle tools and naming.

## Non-Goals

- Cross-file dependency graph traversal beyond a single provided file.
- Forced delete semantics that detach/convert referencing instances.
