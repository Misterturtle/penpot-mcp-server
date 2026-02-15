# Feature Request: Component Lifecycle Management Tools

## Summary

Please add component lifecycle tools to the MCP server:

- `delete_component`
- `rename_component`
- `list_component_instances`

## Problem

Current workflows can create temporary, deprecated, or superseded components, but there is no MCP-level way to cleanly manage component lifecycle afterward. This leaves stale entries in libraries and increases the chance of accidental reuse of obsolete components.

## Proposed Solution

Add explicit component lifecycle operations:

- `delete_component` for safe removal of unused components.
- `rename_component` to support naming standard refactors without recreation.
- `list_component_instances` to identify where a component is currently used before deletion/refactor.

## Why This Matters

These operations are foundational for long-lived design system maintenance and are especially important for automated refactor workflows.

## Acceptance Criteria

- Components can be renamed without re-creation.
- Components can be deleted with clear failure behavior if references block deletion.
- Instances of a component can be enumerated with page/file context.

## Importance

**10/10**
