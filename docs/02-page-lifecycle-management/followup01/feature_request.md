# Feature Request: Follow-up 01 (Duplicate Page Payload Conflict)

## Summary

Patch `duplicate_page` so it succeeds reliably and does not send backend-conflicting `add-page` argument shapes.

## Problem

Validation showed `duplicate_page` fails with:

- `id+name or page should be provided, never both`

`rename_page` and `delete_page` already behave correctly.

## Proposed Solution

Update the MCP tool payload construction for `duplicate_page` to send a backend-valid `add-page` change shape.

## Acceptance Criteria

- `duplicate_page` succeeds with `fileId` + `pageId`.
- Optional naming still works.
- MCP server does not send conflicting `add-page` fields (`id`/`name` combined with `page`).
