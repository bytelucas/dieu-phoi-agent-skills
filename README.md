# Điều Phối Agent Skills

Kho skill dùng chung cho các agent làm việc với dự án `dieu-phoi-api`. Mỗi skill tuân theo cấu trúc `SKILL.md` portable và có thể dùng từ Codex, Claude Code, hoặc agent hỗ trợ thư mục skill chuẩn.

## Skills

- `dieu-phoi-permission-sync`: đưa một thay đổi phân quyền đi trọn chuỗi BA CSV → generated catalog/constants/FE CSV → controller guards → Oracle local/dev → Google Sheet BE–FE → handoff.

## Cài đặt

Repo được giữ ở chế độ private, nên máy cài phải có quyền đọc repo (đã đăng nhập GitHub qua git credential hoặc SSH). Chọn **một** trong hai cách cho mỗi agent — cài cả hai cho Claude Code thì skill xuất hiện hai lần.

### Cách 1 — Claude Code plugin (khuyên dùng cho Claude Code)

Trong Claude Code:

```text
/plugin install dieu-phoi-skills --marketplace bytelucas/dieu-phoi-agent-skills
```

Bản Claude Code cũ chưa có `--marketplace` thì chạy hai bước:

```text
/plugin marketplace add bytelucas/dieu-phoi-agent-skills
/plugin install dieu-phoi-skills@dieu-phoi
```

Skill khi đó mang namespace plugin: `/dieu-phoi-skills:dieu-phoi-permission-sync`. Cập nhật bằng `/plugin marketplace update dieu-phoi`; muốn auto-update chạy nền với repo private thì export `GITHUB_TOKEN` có quyền đọc repo.

### Cách 2 — `install.sh` (Codex + Claude Code, sửa skill tại chỗ)

```bash
git clone https://github.com/bytelucas/dieu-phoi-agent-skills.git
cd dieu-phoi-agent-skills
./install.sh
```

Installer tạo một nguồn chung tại `~/.agents/skills`, rồi đăng ký cùng skill cho:

- Codex: `~/.codex/skills`
- Claude Code: `~/.claude/skills`

Các liên kết trỏ về working copy của repo. Sau này chỉ cần `git pull` để cập nhật skill cho mọi agent trên máy. Đây cũng là cách nên dùng khi đang sửa skill.

## Thêm hoặc sửa skill

- Mỗi skill là một thư mục `skills/<name>/` có `SKILL.md`; `name` trong frontmatter trùng tên thư mục.
- Thêm skill mới thì khai báo thêm đường dẫn vào `skills` trong `.claude-plugin/plugin.json`.
- Script/tài liệu trong skill tham chiếu file của chính nó qua `$SKILL_DIR` (thư mục chứa `SKILL.md`), không viết cứng `~/.agents/...` — cài kiểu plugin thì skill nằm ở chỗ khác.
- Tăng `version` trong `.claude-plugin/plugin.json` mỗi lần đổi skill, để máy cài kiểu plugin nhận bản mới.
- Kiểm tra trước khi push: `claude plugin validate .`

## Sử dụng

Gọi rõ tên skill khi muốn ép áp dụng:

```text
$dieu-phoi-permission-sync thêm quyền mới và đồng bộ local/dev
```

Codex và các agent hỗ trợ model invocation cũng có thể tự chọn skill từ phần `description` trong `SKILL.md`.
