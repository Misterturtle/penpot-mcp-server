# Follow-up Validation: Instance Linkage Metadata in `get_shape_properties`

## Status

Confirmed good.

## MWE Scope

Validated fields in `get_shape_properties`:

- `isComponentInstance`
- `componentId`
- `componentFile`
- `isDetached`

## Result

1. For a component instance root shape, `get_shape_properties` returned:
   - `isComponentInstance: true`
   - non-null `componentId`
   - non-null `componentFile`
2. For non-instance shapes, returned expected non-instance metadata:
   - `isComponentInstance: false`
   - `componentId: null`
   - `componentFile: null`
3. `isDetached` field is present and populated.

This satisfies the requested linkage metadata visibility for automated validation workflows.
