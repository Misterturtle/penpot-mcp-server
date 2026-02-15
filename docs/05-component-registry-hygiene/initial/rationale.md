# Rationale: Component Registry Hygiene Gap

## Gap Summary

The MCP server supports basic component lifecycle operations, but it needs registry-scale hygiene utilities:

- filter component catalog entries by name/path pattern
- detect orphaned entries with no active usage
- surface low-use candidates with enough context for safe cleanup

Without this, maintainers must manually inspect component lists and per-component instance scans, which is slow and error-prone for large libraries.

## Why This Is an MCP-Server Gap (Not an API Gap)

Required data is already available from existing file payloads:

- component registry entries in `file.data.components`
- shape linkage fields (`componentId` / `component-id`, `componentFile` / `component-file`)
- main-instance metadata on components (`mainInstanceId`, `mainInstancePage`)

This means the missing capability is MCP tool surface + aggregation logic, not a backend API capability gap.

## Expected Impact

- faster stale component discovery
- safer cleanup decisions with usage visibility
- better automation support for ongoing design-system maintenance
