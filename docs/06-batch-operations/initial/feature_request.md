# Feature Request: Batch Operations for High-Volume Edits

## Summary

Please add batch variants for repetitive operations, with per-item reporting, for example:

- batch `instantiate_component`
- batch `set_shape_token_bindings`
- batch `delete_shape`

## Problem

Large refactors currently require many single-operation calls. This increases request overhead, slows execution, and complicates partial-failure handling.

## Proposed Solution

Provide batch APIs/tools that accept arrays of operations and return structured per-item success/failure outcomes.

## Why This Matters

Batch support significantly improves performance and reliability for real-world refactors and migrations.

## Acceptance Criteria

- Batch endpoints/tools accept multiple operations in one request.
- Response includes item-level status and errors.
- Partial successes are supported without aborting the full batch.

## Importance

**8/10**
