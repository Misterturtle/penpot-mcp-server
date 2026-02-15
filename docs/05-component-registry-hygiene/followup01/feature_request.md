# Feature Request: Follow-up 01 - Cross-file Usage in Registry Hygiene

## Summary

Update component registry hygiene tools so orphan/usage analysis includes cross-file instances in files that consume the source library.

## Reported Behavior

- `query_components` and `list_orphan_components` currently classify components as orphaned when usage exists only in consumer files.
- In-file usage is detected correctly.

## Expected Behavior

- Active instance counts should include both:
  - source file instances
  - consumer-file instances linked via `componentFile`

## Why This Matters

Library cleanup decisions are unsafe if cross-file usage is ignored; false orphan classification can cause accidental deletion of in-use components.
