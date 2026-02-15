# Rationale: Follow-up 01

## Validation Finding

Follow-up validation identified a targeted defect in page lifecycle tooling:

- `duplicate_page` fails due to invalid `add-page` argument composition.

## Root Cause

The MCP handler constructs `add-page` using all of the following at once:

- `id`
- `name`
- `page`

Penpot backend expects either:

- `id`/`name` style creation, or
- `page` payload style creation

but not both simultaneously.

## Why This Is an MCP-layer Fix

No API extension is required. The backend already supports page duplication via existing `add-page` primitives; the issue is request-shape orchestration in `src/tools/page-tools.ts`.

## Remediation Direction

- Build duplicated page data with embedded `id`/`name`.
- Submit `add-page` using only `page` in the change payload.
- Keep tool response and deterministic naming behavior unchanged.
