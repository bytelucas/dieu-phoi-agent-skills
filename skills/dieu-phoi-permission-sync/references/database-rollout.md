# Oracle drift and rollout

Read this reference when comparing or applying the permission catalog and endpoint mappings in Oracle.

## Environment invariant

This repository's `.env` contains repeated `DB_ORGANIZING_*` assignments. The local block is the first active complete block; the dev block is the last active complete block. `dotenv` keeps the last value unless the process already received an override.

Use `scripts/with-organizing-env.cjs` so the target is selected deterministically and printed without the password. The wrapper rejects a local host for `dev` and a remote host for `local`. If the `.env` layout changes, inspect it and update the wrapper before writing.

Set reusable paths without copying credentials:

```bash
REPO="$PWD"
SKILL_DIR="/absolute/path/to/this/skill"  # directory containing SKILL.md; differs per install method
RUN_DIR="$REPO/.tmp/permission-sync"
mkdir -p "$RUN_DIR"
pnpm seed:endpoints -- --dry-run > "$RUN_DIR/endpoints.txt"
```

## Read-only drift

Run both targets requested by the user. These commands only issue `SELECT` statements:

```bash
node "$SKILL_DIR/scripts/with-organizing-env.cjs" --repo "$REPO" --target dev -- \
  node "$SKILL_DIR/scripts/check-endpoint-drift.cjs" --repo "$REPO" \
  --input "$RUN_DIR/endpoints.txt" --label dev

node "$SKILL_DIR/scripts/with-organizing-env.cjs" --repo "$REPO" --target local -- \
  node "$SKILL_DIR/scripts/check-endpoint-drift.cjs" --repo "$REPO" \
  --input "$RUN_DIR/endpoints.txt" --label local
```

Account for each reported category:

- code endpoint missing in DB: endpoint sync will insert it;
- live DB endpoint missing in code: endpoint sync will soft-delete it and remove its links;
- missing/stale `SOURCE=DECORATOR` link: endpoint sync will add/remove it;
- permission code used by a controller but absent from `PERMISSIONS`: catalog seed must run first;
- `SOURCE=MANUAL`: endpoint sync leaves it unchanged.

The write impact is fully understood only when every nonzero category has been reviewed.

## Apply

Run writes only for environments named in the current request. Use the user's requested order; otherwise prefer local before dev. For each target, apply the generated catalog and role ticks before syncing endpoint links:

```bash
node "$SKILL_DIR/scripts/with-organizing-env.cjs" --repo "$REPO" --target local -- \
  pnpm seed:run organizing
node "$SKILL_DIR/scripts/with-organizing-env.cjs" --repo "$REPO" --target local -- \
  pnpm seed:endpoints
```

Replace `local` with `dev` for the dev database. Keep credentials in `.env`; never paste passwords into commands, logs, the skill, or handoff.

Verify the same target immediately:

```bash
node "$SKILL_DIR/scripts/with-organizing-env.cjs" --repo "$REPO" --target local -- \
  node "$SKILL_DIR/scripts/check-endpoint-drift.cjs" --repo "$REPO" \
  --input "$RUN_DIR/endpoints.txt" --label local --require-clean
```

Completion means `missing endpoints = 0`, `stale endpoints = 0`, `missing decorator links = 0`, `stale decorator links = 0`, and `missing permission codes = 0` for every written target.
