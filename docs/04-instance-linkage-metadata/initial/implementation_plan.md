# Implementation Plan: Linkage Metadata in `get_shape_properties`

## Scope

Enhance `get_shape_properties` in `src/tools/page-advanced-tools.ts` to return component-instance linkage metadata:

- `isComponentInstance`
- `componentId`
- `componentFile`
- `isDetached`

## Design

### 1. Normalize linkage field access

Add helper accessors supporting camelCase and kebab-case payload variants:

- `componentId` / `component-id`
- `componentFile` / `component-file`
- `shapeRef` / `shape-ref`
- `mainInstance` / `main-instance`
- `componentRoot` / `component-root`

### 2. Compute linkage fields in `get_shape_properties`

For every shape response:

- always emit `isComponentInstance` as boolean
- always emit `componentId` as string or `null`
- always emit `componentFile` as string or `null`

### 3. Best-effort detached detection

Implement `isDetached` with deterministic server-side rules:

- if `componentId` exists, verify referenced component existence in the source file (or in `componentFile` when provided)
  - component found => `isDetached = false`
  - component missing => `isDetached = true`
  - cross-file lookup inaccessible => `isDetached = null`
- if `componentId` is absent but residual component metadata exists (`shapeRef`, `mainInstance`, or `componentRoot`) => `isDetached = true`
- otherwise => `isDetached = false`

## Validation

- Run `npm run build` to ensure TypeScript compile passes after helper additions and handler logic changes.

## Non-Goals

- adding new backend API endpoints
- introducing a strict authoritative detached flag beyond current payload evidence
