# Follow-up Validation: Instance Linkage Metadata (Follow-up 02)

## Status

Confirmed good.

## MWE Scope

Validated fields in `get_shape_properties`:

- `isComponentInstance`
- `componentId`
- `componentFile`
- `isDetached`

## Result

1. For non-instance shapes: `isComponentInstance: false`, `componentId/componentFile: null`.
2. For instance root shapes: `isComponentInstance: true` with correct non-null `componentId` and `componentFile`.
3. `isDetached` is present and populated.

This satisfies the requested instance-linkage metadata visibility.
