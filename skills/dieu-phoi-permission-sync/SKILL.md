---
name: dieu-phoi-permission-sync
description: Add or change authorization permissions in the dieu-phoi-api repository, from the BA CSV matrix through generated catalogs, controller guards, local/dev Oracle drift and rollout, the shared FE Google Sheet, and handoff. Use for permission-matrix or endpoint-authorization changes in this repository.
---

# Điều Phối permission sync

Carry one permission change through every representation that must agree. Work from the `dieu-phoi-api` repository root and read its root `AGENTS.md` plus `apps/organizing/AGENTS.md` before editing.

`SKILL_DIR` in the references means the directory containing this `SKILL.md` (the skill's base directory). It differs between a plugin install and a manual symlink, so resolve it at runtime instead of assuming a fixed path.

## Sources of truth

Keep these roles distinct:

- `apps/organizing/src/database/oracle/seed/data/ma-tran-phan-quyen.csv` is the human-edited BA matrix.
- `pnpm seed:gen-catalog` owns `permission-catalog.ts`, `libs/utils/src/constants/permission.ts`, and `ma-tran-phan-quyen-FE.csv`. Treat all three as generated files.
- `@RequirePermission` on controllers is the runtime gate. The endpoint database projection documents and exposes those mappings to admin screens.
- The shared Google Sheet is the BE–FE contract mirror of `ma-tran-phan-quyen-FE.csv` after the change has landed.

## Workflow

1. **Baseline.** Record the branch, base commit, and `git status`. Preserve unrelated work. Identify every requested permission row, role-group tick, and endpoint before editing. Completion: every requested behavior has a proposed matrix row and endpoint mapping; unresolved business meaning is explicit.

2. **Edit and normalize.** Change only `ma-tran-phan-quyen.csv`, then run:

   ```bash
   pnpm seed:normalize-matrix
   ```

   Review the CSV diff for spelling, capitalization, hierarchy carry-forward, and the ten role-group columns. Completion: the diff contains only intended business changes and valid CSV normalization.

3. **Generate.** Run `pnpm seed:gen-catalog`, then inspect all generated diffs. Existing permission codes must remain byte-for-byte stable unless the request explicitly renames or replaces them. Never repair a generated file by hand; fix the BA matrix or generator and regenerate. Completion: each new assignable row has one expected constant and catalog node, and the FE CSV represents the same roles.

4. **Audit endpoints semantically.** Derive the changed permission codes from the generated diff and search all relevant controllers for `@Post` and `@RequirePermission`. Map each route to the permission that describes the action, including helper/list endpoints needed by the screen. Do not choose a code from path-name similarity alone. Completion: every affected API is accounted for as changed, intentionally unchanged, or unrelated.

5. **Discover and compare.** Run the endpoint parser with the extra argument separator:

   ```bash
   mkdir -p .tmp/permission-sync
   pnpm seed:endpoints -- --dry-run > .tmp/permission-sync/endpoints.txt
   pnpm test -- scripts/seed/sync-endpoints.spec.ts --runInBand
   git diff --check
   ```

   For Oracle comparison or rollout, read [references/database-rollout.md](references/database-rollout.md). Completion before any write: the dry-run imports every controller successfully, lists the expected permission codes, and drift is known for every requested environment.

6. **Review and land.** Summarize matrix rows, generated artifacts, guard changes, tests, and environment drift. Follow the repository branch/MR rules and keep AI attribution out of commits and MR text. Create or update an MR only when requested. Completion: the landed commit contains the BA input, all three generated outputs, and all required controller changes.

7. **Apply named environments.** Database writes require a current user request naming the target environments. Apply the catalog before endpoint links, in the requested order, then rerun the read-only drift check with `--require-clean`. Completion: every named environment reports zero endpoint, decorator-link, and missing-permission drift.

8. **Sync the FE contract.** After the code has landed, read [references/google-sheet.md](references/google-sheet.md) and update the shared sheet from the generated FE CSV. Completion: the tab matches all 20 columns and all used rows, changed-row colors follow the sheet legend, and the document reports saved.

9. **Handoff.** Write `.tmp/handoff/<YYYY-MM-DD>-permission-sync-<scope>.md` when the run is substantial or another session may continue it. Record commands, observed counts, commits/MR, environments actually written, Sheet verification, and unresolved decisions. Point to source files and commits instead of copying generated catalogs.

For the exact sequence and decisions from the rollout that established this workflow, read [references/worked-example-2026-09-11.md](references/worked-example-2026-09-11.md). Use it as evidence, not as a row-number template.

## Final completion gate

Do not report the permission change complete until all requested layers are accounted for: BA matrix, generated catalog/constants/FE CSV, runtime controller guards, endpoint dry-run, named Oracle environments, shared Sheet, and handoff when needed. Clearly mark any layer the user did not authorize or did not request.
