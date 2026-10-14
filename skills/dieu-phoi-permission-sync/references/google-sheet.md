# Shared Google Sheet sync

Read this reference after the code change has landed and the user wants the BE–FE permission contract updated.

## Destination and source

- Spreadsheet: the URL is kept out of this skill. Read it from the `dieu-phoi-api` repository root with `grep '^DEV_PERMISSION_SHEET_URL=' .env.dev.local`; if the key is missing, ask the user for the link instead of guessing.
- Target tab: `ma-tran-phan-quyen-with-code` (`sheetId=759676379`)
- Preserve the `Danh sách tài khoản` tab.
- Expected values: `apps/organizing/src/database/oracle/seed/data/ma-tran-phan-quyen-FE.csv`, columns `A:T`.

The local generated FE CSV is authoritative for cell values. The live sheet remains authoritative for existing formatting, comments, frozen rows, and other collaboration metadata.

## Edit

1. Read spreadsheet metadata and the bounded rows around every insertion or modification.
2. Prefer a connected Google Sheets/Drive API for precise range reads and writes. If the connector is read-only, use the authenticated browser UI. Do not change sharing or access permissions as part of content sync.
3. Insert rows where the generated CSV inserted them; update existing cells in place. Avoid replacing the whole tab because that can discard collaboration metadata.
4. Preserve the sheet's legend:
   - added rows: **light green 3**, RGB `D9EAD3`;
   - modified rows: **light orange 3**, RGB `FCE5CD`.
5. Leave unchanged rows and the second tab untouched.

If a full-table comparison exposes older drift, treat it as a separate finding. During a full contract sync, repair it and mark the row orange. During a narrowly scoped edit, report it without silently expanding scope.

## Verify

Read all used rows in `A:T` after the edit and compare them cell-by-cell with the FE CSV. Ignore only the UTF-8 BOM in the CSV's first cell and missing trailing empty cells. Zero value differences is the completion criterion.

When a CSV export of the live tab is available, run:

```bash
node "$SKILL_DIR/scripts/compare-csv.cjs" \
  --expected apps/organizing/src/database/oracle/seed/data/ma-tran-phan-quyen-FE.csv \
  --actual .tmp/permission-sync/google-sheet.csv --columns 20
```

Also verify the background color of every changed row, inspect the changed regions visually at normal zoom, and confirm the document status is `Saved to Drive` or its equivalent.
