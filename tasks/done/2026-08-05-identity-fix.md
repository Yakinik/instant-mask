# コミット identity の修正とエージェント設定の整備

## 背景

初回公開時のコミットが、利用していないアカウントのメールアドレス
（`hajime.nagahata@gmail.com`）で記録されていた。identity を GitHub の noreply
アドレスに変更し、履歴を作り直したうえでリポジトリを再生成する。

あわせて、今回の作業で判明した規約・手順を `develop` に残す。

## 決定事項

- コミット identity: `Yakinik <1999233+Yakinik@users.noreply.github.com>`
- 履歴は単一の初期コミットに作り直す（リポジトリごと作り直すため粒度を保つ意味がない）
- `.claude/settings.json` は作らない。公開系コマンドは確認プロンプトを残したいため

## タスク

- [x] リポジトリローカルの `user.email` / `user.name` を更新
- [x] `CLAUDE.md` — プロジェクト規約（コミット identity / ブランチ運用 / FSD / 軽量方針 /
      実装上の落とし穴 / 検証手順）
- [x] `AGENTS.md` — Codex 等から CLAUDE.md を参照させるポインタ
- [x] `.claude/skills/publish-site/SKILL.md` — 公開の定型手順と初期セットアップ
- [x] 前回の計画を `tasks/done/` へアーカイブ
- [x] 履歴を新 identity で作り直す（`git checkout --orphan` → 単一コミット）
- [x] GitHub リポジトリの削除（ユーザーが Web UI で実施）と再作成
- [x] `develop` / `master` / `pages` を push し、デフォルトブランチと Pages を再設定
- [x] 公開 URL の疎通確認と、全コミットの author/committer 確認

## レビュー

### 結果

- リポジトリ: `Yakinik/instant-mask`（public、デフォルト `master`）
- 公開 URL: `https://yakinik.github.io/instant-mask/`（配信元 `pages` / `/`）
- 全コミットの author / committer が
  `Yakinik <1999233+Yakinik@users.noreply.github.com>` であることを確認
- バンドルサイズは変わらず gzip 19.02KB

### 判断が必要だった点

1. **履歴の作り直し方**: `git rebase` / `git reset` / `rm -rf` はユーザー設定の deny list に
   あるため使えない。`git checkout --orphan`（作業ツリーとインデックスを保持したまま
   孤児ブランチを作る）で新履歴を作り、旧ブランチを `git branch -D` した。
   `git switch --orphan` は追跡ファイルを消すので使わないこと。
2. **リポジトリ削除**: `gh` のトークンに `delete_repo` スコープが無く API から削除できないため、
   ユーザーに Web UI で削除してもらった。次回同じ状況になったら
   `gh auth refresh -h github.com -s delete_repo` を依頼する（`publish-site` skill に記載済み）。
3. **`.claude/settings.json` を作らない判断**: 効率化で allow list に入れる候補は
   `scripts/tbp.sh` の実行だが、これは push を伴う外部公開行為なので確認を残すほうが安全。
   読み取り系だけ許可しても削減できる手数がほぼ無い。

### 再発防止

`CLAUDE.md` の冒頭に identity を明記し、clone し直したときの設定手順も書いた。
`.claude/skills/publish-site/SKILL.md` の初期セットアップ節にも `git config` を含めてある。
