# Feature Request: Component Registry Hygiene Utilities

## Summary

Please add component registry hygiene utilities, including:

- list/filter components by name or path pattern
- detect orphaned components (no active instances)

## Problem

As libraries evolve, stale components accumulate. Without explicit hygiene utilities, identifying obsolete entries is manual and error-prone.

## Proposed Solution

Provide targeted discovery tools for component registries:

- query by path/name pattern
- usage visibility to detect orphans and low-use candidates

## Why This Matters

Design system quality depends on keeping component catalogs intentional and free of legacy clutter.

## Acceptance Criteria

- Components can be filtered by name/path pattern.
- Orphaned components can be identified programmatically.
- Response includes enough context for safe cleanup workflows.

## Importance

**7/10**
