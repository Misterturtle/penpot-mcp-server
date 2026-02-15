# Implementation Plan: In-Place Text Content Updates

## Scope

Extend `update_shape` in `src/tools/page-advanced-tools.ts` to support direct text content mutation on existing text shapes.

## Design

1. Extend tool schema:

- Add optional `text` input for `update_shape`.

2. Implement text-content mutation in handler:

- For text shapes, deep-clone `content` and mutate text nodes in-place.
- Preserve paragraph/text-node structure where possible.
- Keep `shapeId` unchanged by using a single `mod-obj` update path.

3. Prevent content-write conflicts:

- Consolidate text-related content updates (text content + text styling + text-node fills) into one `content` mutation pass so updates do not clobber each other.

4. Preserve non-text properties:

- Keep existing update behavior for position/style/etc.
- Apply only requested fields.

5. Validation:

- Add integration coverage in `test-tools.ts` for in-place text updates and identity/style preservation checks.
- Run `npm run build` and `npm run lint`.

## Non-Goals

- Introducing a separate `update_text_content` tool (unnecessary with updated `update_shape`).
- Reworking all text extraction/query behavior beyond the requested mutation capability.
