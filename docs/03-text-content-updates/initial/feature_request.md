# Feature Request: Update Text Content on Existing Shapes

## Summary

Please support direct text content mutation on existing text shapes, either by:

- extending `update_shape` with text content support, or
- adding a dedicated `update_text_content` tool.

## Problem

Today, changing text content often requires delete/recreate patterns. This is disruptive because it can break shape identity continuity and any references tied to those shape IDs.

## Proposed Solution

Support in-place text updates for text shapes while preserving shape IDs and existing bindings/properties unless explicitly changed.

## Why This Matters

In-place content editing is a core operation for maintaining specs, labels, and documentation regions without destructive edits.

## Acceptance Criteria

- Text content can be updated by shape ID.
- Shape ID remains unchanged.
- Existing non-text properties (position, style, bindings) remain intact unless explicitly updated.

## Importance

**8/10**
