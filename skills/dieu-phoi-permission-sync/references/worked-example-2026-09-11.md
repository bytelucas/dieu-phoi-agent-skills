# Worked example — 2026-09-11

This is the historical run that established the workflow. Its row numbers are evidence only; future runs derive positions from the current generated CSV.

1. Ran `pnpm seed:normalize-matrix` on the BA matrix.
2. Reviewed the business diff and corrected wording/capitalization before generation, including the module label `XỬ LÝ HỒ SƠ`.
3. Ran `pnpm seed:gen-catalog`, producing the catalog, constants, and FE CSV.
4. Audited APIs for the new permissions. The three `/employee/proxy-receiving-units/*` routes moved to `HT_DON_VI_NGUOI_DUNG_CAU_HINH_DON_VI_TIEP_NHAN`.
5. Kept `/department/tree-units` on the semantically correct existing permission `HT_DON_VI_HANH_CHINH_XEM_DS`, as explicitly decided by the user.
6. Ran `pnpm seed:endpoints -- --dry-run`, then compared endpoint and decorator-link drift against dev and local Oracle.
7. Landed commit `1efd20f2` through MR `!554`; merge commit on `dev` is `01c22d84`.
8. After merge, applied the requested DB sync to dev using the dev credentials already stored in `.env`, then applied local. Credentials were not copied into commands or documentation.
9. Updated the shared Google Sheet tab from the generated FE CSV:
   - added `Cấu hình đơn vị tiếp nhận`;
   - added three `Hồ sơ chờ phê duyệt` permissions;
   - updated `XỬ LÝ HỒ SƠ`;
   - repaired two older value drifts found by full comparison: `Retry đồng bộ thủ công` and the `CB_TIEP_NHAN` tick for `In phiếu từ chối`;
   - colored additions green and modifications orange.
10. Compared 320 used rows × 20 columns between the Sheet and `ma-tran-phan-quyen-FE.csv`; the final difference count was zero.

The key decision from this run is semantic endpoint mapping: a route used by a new screen does not automatically inherit that screen's new permission. `/department/tree-units` lists administrative units, so it uses the administrative-unit list permission; the proxy-receiving assignment routes perform the newly introduced configuration action and use the new code.
