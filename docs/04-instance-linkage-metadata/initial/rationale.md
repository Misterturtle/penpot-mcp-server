# Rationale: Instance Linkage Metadata in `get_shape_properties`

## Gap Summary

`get_shape_properties` currently returns geometry and visual fields, but omits component linkage metadata that already exists in Penpot file object payloads. This forces multi-call workflows for a basic audit question: "is this shape still linked to a component?"

## Why This Is an MCP-Server Gap (Not an API Gap)

Penpot file object data already exposes component linkage fields the server can read directly:

- `componentId` / `component-id`
- `componentFile` / `component-file`
- `shapeRef` / `shape-ref`
- `mainInstance` / `main-instance`
- `componentRoot` / `component-root`

Because these fields are already available from existing `get-file` responses, no backend API feature is required to satisfy the request for `isComponentInstance`, `componentId`, and `componentFile`. The MCP server only needs to surface and normalize them in `get_shape_properties`.

`isDetached` does not have a single canonical backend flag in the current payload. A best-effort detector can still be implemented from available metadata and component existence checks, with explicit `null` when cross-file verification is not available.

## Expected Impact

- single-call instance linkage checks for audit flows
- simpler automation for refactor and QA validation
- clearer machine-readable semantics for non-instance vs linked vs likely-detached shapes
