# Rationale: Follow-up 01

## Validation Finding

Follow-up validation found a safety gap in registry hygiene reporting:

- `query_components` and `list_orphan_components` reported components as orphaned when usage existed only in consumer files linked to the source library file.

## Root Cause

The initial hygiene implementation summarized usage strictly from the source `fileId` payload (`pagesIndex -> objects`).  
Cross-file instance inspection logic existed in `delete_component`, but was not reused by `query_components` / `list_orphan_components`.

Result:

- false orphan classification for library components used in downstream files
- insufficient cleanup safety context for shared-library maintenance

## Why This Is MCP-layer (Not API-layer)

No backend API extension is required. Existing APIs already provide what is needed:

- `get-library-file-references` to enumerate consumer files for a source library file
- `get_file` payload shape linkage (`componentId`, `componentFile`) to count cross-file usage

The gap is in MCP orchestration and aggregation logic.

## Remediation Direction

- add shared cross-file usage inspection for source library files
- merge in-file + cross-file instance counts in hygiene summaries
- fail closed when cross-file inspection cannot be completed (avoid unsafe false orphan signals)
