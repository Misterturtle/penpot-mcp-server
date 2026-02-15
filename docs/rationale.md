# Rationale: Component Registry Hygiene Gap

## Gap Summary

The MCP server currently has baseline component lifecycle operations (`list_components`, `list_component_instances`, `rename_component`, `delete_component`), but it still lacks registry hygiene utilities for maintenance workflows:

- no direct pattern filtering by component `name` and `path`
- no direct orphan/low-use detection at registry scale
- no aggregated usage context suitable for safe cleanup decisions

Today, maintainers must enumerate components manually and run per-component inspection loops, which is slow and error-prone for large libraries.

## Why This Is an MCP-Server Gap (Not an API Gap)

The required primitives are already available in current file payloads:

- component registry entries are present in `file.data.components`
- instance linkage is present on shapes via `componentId` / `component-id` and `componentFile` / `component-file`
- main-instance metadata is available on components (`mainInstanceId`, `mainInstancePage`)

Because all necessary data can be derived from `get_file` + existing MCP-side parsing, this request does not require a new Penpot backend API capability.

## Expected Impact

- faster stale-component discovery during design system maintenance
- safer deletion/refactor workflows with reference counts and contextual evidence
- better automation support for continuous component catalog hygiene
