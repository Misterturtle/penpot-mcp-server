# Feature Request: Instance Linkage Metadata in `get_shape_properties`

## Summary

Please include component-instance linkage fields in `get_shape_properties`, such as:

- `isComponentInstance`
- `componentId`
- `componentFile`
- `isDetached` (if available)

## Problem

There is currently no reliable single-call way to validate whether a shape on a consumer page is still linked to its library component. This limits auditing and makes refactors harder to verify.

## Proposed Solution

Augment shape property responses with explicit instance linkage metadata for all component instances.

## Why This Matters

Automated QA and refactor validation require machine-readable confirmation that placed components are live-linked, not detached copies.

## Acceptance Criteria

- Instance shapes return linkage fields in `get_shape_properties`.
- Non-instance shapes return explicit null/false equivalents.
- Detached instances are detectable.

## Importance

**9/10**
