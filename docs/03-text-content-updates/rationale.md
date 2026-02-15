# Rationale: Text Content Mutation Gap

## Gap Summary

`update_shape` currently supports many text-related updates (font family/weight/style, alignment, spacing) but does not expose a direct text content field. This forces downstream automation to use delete/recreate patterns when only text copy changes are needed.

That breaks shape identity continuity and increases risk for workflows that depend on stable shape IDs.

## Why This Is an MCP-Server Gap (Not an API Gap)

The server already performs `mod-obj` operations with `set` on text shape `content` for text-node styling and token-reference updates. That demonstrates the required backend capability already exists in current Penpot API behavior consumed by this server.

Because the API primitive is available and already used, the missing capability is in MCP tool surface design (`update_shape` input/handler), not a backend API limitation.

## Expected Impact

- Enables in-place text content updates by `shapeId`.
- Preserves shape identity and non-target properties by avoiding destructive replace flows.
- Simplifies agent automation for spec/annotation maintenance.
