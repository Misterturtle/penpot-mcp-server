# Rationale: Follow-up 01

## Validation Findings

Follow-up validation identified two behavior gaps after the initial lifecycle implementation:

1. `delete_component` allowed deletion while active cross-file instances still existed.
2. `rename_component` returned path values with unexpected structural transformation.

## Root Causes

### Delete gap

Initial deletion safety only scanned the source file where the component is defined.  
For library components, active references can live in other files linked to that library file.  
Result: false negative safety check and unsafe delete pass.

### Rename path gap

Initial rename logic normalized and rebuilt path segments using `/` splitting and trimming.  
That strategy can alter formatting semantics and produce surprising output when existing path strings contain intentional spacing or mixed separator styles.

## Why This Remains an MCP-layer Fix

No API extension is required:

- Library reference files are queryable via `get-library-file-references`.
- Component metadata remains writable via `mod-component`.

The issue is orchestration/normalization logic in MCP tooling, not missing backend capability.

## Remediation Direction

- Harden `delete_component` to inspect component usage across all files referencing the library before allowing deletion.
- Make `rename_component` path behavior non-destructive by default:
  - preserve existing path semantics when no explicit `path` is provided
  - only perform minimal suffix replacement when it can be inferred safely.
