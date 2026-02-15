# Rationale: Page Lifecycle Gap

## Gap Summary

The MCP server currently exposes `list_pages` and `add_page`, but does not expose page lifecycle operations after creation:

- no direct page rename operation
- no direct page delete operation
- no direct page duplicate operation

This blocks cleanup and repeatable test/demo workflows from being fully automated.

## Why This Is an MCP-Server Gap (Not an API Gap)

Penpot file updates already support the required page-level change primitives via `update-file`:

- `mod-page` for renaming page metadata
- `del-page` for deleting pages
- `add-page` for adding pages, including a `page` payload for cloning page data

Because these primitives are available in the current API contract (`openapi.json` and generated types), this request is a missing MCP tool-surface issue, not an upstream API capability gap.

## Expected Impact

- deterministic cleanup of temporary pages in scripted runs
- safer and faster test/migration loops via programmatic duplication
- fewer manual UI steps in CI-like automation workflows
