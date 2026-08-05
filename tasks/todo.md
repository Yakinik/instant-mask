# コミット identity の修正とエージェント設定の整備

## 背景

初回公開時のコミットが、利用していないアカウントのメールアドレス
（`hajime.nagahata@gmail.com`）で記録されていた。identity を GitHub の noreply
アドレスに変更し、履歴を作り直したうえでリポジトリを再生成する。

あわせて、今回の作業で判明した規約・手順を `develop` に残す。

## 決定事項

- コミット identity: `Yakinik <1999233+Yakinik@users.noreply.github.com>`
- 履歴は単一の初期コミットに作り直す（リポジトリごと作り直すため粒度を保つ意味がない）
- `.claude/settings.json` は作らない。公開系コマンドは確認を残したいため

## タスク

- [x] リポジトリローカルの `user.email` / `user.name` を更新
- [x] `CLAUDE.md` — プロジェクト規約（コミット identity / ブランチ運用 / FSD / 軽量方針 /
      実装上の落とし穴 / 検証手順）
- [x] `AGENTS.md` — Codex 等から CLAUDE.md を参照させるポインタ
- [x] `.claude/skills/publish-site/SKILL.md` — 公開の定型手順と初期セットアップ
- [x] 前回の計画を `tasks/done/` へアーカイブ
- [ ] 履歴を新 identity で作り直す（orphan ブランチ → 単一コミット）
- [ ] GitHub リポジトリを削除して再生成（`delete_repo` スコープが必要）
- [ ] `develop` / `master` / `pages` を push し、デフォルトブランチと Pages を再設定
- [ ] 公開 URL の疎通確認と、全コミットの author/committer 確認

## レビュー

（完了後に記入）
