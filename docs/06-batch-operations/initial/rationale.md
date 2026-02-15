# Rationale: Batch Operations Gap

## Gap Summary

The MCP server currently exposes single-item mutations for high-frequency workflows:

- `instantiate_component`
- `set_shape_token_bindings`
- `delete_shape`

High-volume migrations must call these tools repeatedly, which increases MCP request overhead and leaves failure handling to the client.

## Why This Is an MCP-Server Gap (Not an API Gap)

The required primitives already exist:

- `instantiate_component` already calls Penpot's instantiate command.
- `set_shape_token_bindings` and `delete_shape` already use `update-file` changes (`mod-obj` / `del-obj`).

Batch behavior can be implemented as MCP-layer wrappers that execute arrays of existing operations and return normalized item-level outcomes. No new backend API primitive is required to satisfy the feature request acceptance criteria.

## Expected Impact

- fewer MCP round trips for bulk refactors
- standardized per-item error reporting and partial success semantics
- simpler, safer migration tooling for AI agents and scripts
