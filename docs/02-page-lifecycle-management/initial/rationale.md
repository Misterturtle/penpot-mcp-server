# Rationale: Page Lifecycle Gap

## Gap Summary

The MCP server supports page listing and page creation but lacks full page lifecycle controls required for automated cleanup and repeatable setup workflows:

- no explicit page rename operation
- no explicit page delete operation
- no explicit page duplicate operation

This creates avoidable manual UI work in test/migration loops and prevents end-to-end scripted runs.

## Why This Is an MCP-Server Gap (Not an API Gap)

Penpot file updates already provide the necessary primitives via `update-file` changes:

- `mod-page` for page rename/update
- `del-page` for page deletion
- `add-page` for page creation/clone-style insertion

Given those primitives already exist in the server contract and generated types, this request is an MCP tool-surface gap rather than a backend API capability gap.

## Expected Impact

- cleaner test/migration workflows through scriptable page cleanup
- faster baseline creation via page duplication
- reduced manual maintenance for iterative design automation
