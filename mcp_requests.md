# MCP Extension Requests (Active)

1. **Component lifecycle management**

- Request tools: `delete_component`, `rename_component`, `list_component_instances`.
- Need: clean up deprecated/test components and safely refactor large libraries.

2. **Page lifecycle management**

- Request tools: `delete_page`, `rename_page`, `duplicate_page`.
- Need: automate cleanup of temporary pages and repeatable demo/test workflows.

3. **Text content updates for existing text shapes**

- Request: support editing text content on existing shapes (`update_shape` enhancement or `update_text_content` tool).
- Need: avoid delete/recreate patterns that break IDs, comments, and downstream references.

4. **Instance linkage metadata in `get_shape_properties`**

- Request fields: `isComponentInstance`, `componentId`, `componentFile`, `isDetached` (if available).
- Need: verify that demo/consumer pages are still linked to library components after refactors.

5. **Component registry hygiene utilities**

- Request tools: list/filter components by path/name pattern and detect orphaned components (no active instances).
- Need: keep library catalogs clean and prevent stale components from being reused.

6. **Batch operations for high-volume edits**

- Request: batch variants for repeated operations (`instantiate_component`, `set_shape_token_bindings`, `delete_shape`) with per-item success/failure reporting.
- Need: reduce request overhead and improve reliability for large-scale refactors.
