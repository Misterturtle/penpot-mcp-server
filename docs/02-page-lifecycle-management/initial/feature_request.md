# Feature Request: Page Lifecycle Management Tools

## Summary

Please add page lifecycle tools to the MCP server:

- `delete_page`
- `rename_page`
- `duplicate_page`

## Problem

Temporary pages are commonly created for tests and migrations. Without page lifecycle tools, cleanup and repeatable workflows require manual UI work and break full automation.

## Proposed Solution

Expose page lifecycle operations directly in MCP:

- `delete_page` for cleanup.
- `rename_page` for standardized naming.
- `duplicate_page` for quick baseline cloning in demo/test setups.

## Why This Matters

Page lifecycle control is essential for reliable, end-to-end scripted workflows and keeping files clean after iterative testing.

## Acceptance Criteria

- Pages can be renamed and deleted by ID.
- Pages can be duplicated with deterministic naming behavior.
- Failure cases are explicit (missing page, permission, protected page, etc.).

## Importance

**9/10**
