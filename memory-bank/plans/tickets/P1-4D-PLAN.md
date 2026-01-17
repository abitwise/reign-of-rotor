# Ticket P1-4D — Asset + LOD Contract for Large Worlds (Manifests + Budget Limits)

**Status:** Done  
**Last Updated:** 2026-01-09

## Summary
Define asset budget limits and LOD/instancing requirements for large-world props, update the asset manifest schema to carry LOD metadata, and introduce a lightweight validation hook to enforce the contract during development.

## Objectives
- Establish explicit budgets for triangles, materials, and texture sizes per prop.
- Define LOD requirements for buildings and trees to support streaming/instancing workflows.
- Extend the asset manifest schema with LOD variant metadata (even if only LOD0 exists today).
- Add a lightweight validation script hook to validate manifest entries and budget metadata (no heavy analysis yet).

## Deliverables
- Updated asset manifest schema + parser to support LOD metadata and budget fields.
- Updated manifest JSON entries for existing assets with LOD0 metadata.
- Basic validation script that checks manifest schema compliance and budget metadata presence.
- Updated tests for the manifest parser/validator.

## Notes
- Keep render/asset loading backward compatible by defaulting to LOD0 when only a base path exists.
- Validation is schema-level only (no geometry inspection) in this ticket; future tooling can add actual mesh analysis.
- Budgets should be documented in the manifest to guide future content additions.
- The validation hook currently checks schema compliance and warns on missing LODs/budgets, without inspecting mesh geometry.
