# Rationale: Component Lifecycle Gap

## Gap Summary

The MCP server currently supports component creation, listing, and instantiation, but it does not expose lifecycle controls for post-creation governance:

- no direct component rename operation
- no direct component delete operation
- no direct component instance inventory operation

This creates operational friction for library maintenance and automated refactor workflows.

## Why This Is an MCP-Server Gap (Not an API Gap)

Penpot `update-file` changes already support:

- `mod-component` (rename/path updates)
- `del-component` (component deletion)

The server can also derive component usage by inspecting file `pagesIndex -> objects` and matching shape-level component linkage fields (`componentId`/`component-id`, `componentFile`/`component-file`).

Because the required primitives are already present in existing API behavior and file payloads, the missing capability is an MCP tooling surface gap, not a backend API capability gap.

## Expected Impact

- safer deprecation workflows by checking references before deletion
- reduced stale component accumulation in long-lived libraries
- better automation support for naming standard migrations and cleanup tasks
