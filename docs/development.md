# 開発メモ

## セットアップ

```bash
npm install
npm run dev     # 開発サーバー
npm run build   # 型チェック + 本番ビルド（dist/）
```

## ブランチ運用

| ブランチ | 役割 |
| --- | --- |
| `master` | README.md だけの情報掲示ブランチ（デフォルト） |
| `develop` | ソース一式。編集はここだけで行う |
| `pages` | ビルド成果物だけの公開ブランチ（GitHub Pages の配信元） |

`master` と `pages` は `scripts/tbp.sh` が一時 worktree 経由で全内容を再構成する。
手動でコミットを積まないこと（次回の同期で消える）。

```bash
bash scripts/tbp.sh publish       # ビルドして pages ブランチへ公開
bash scripts/tbp.sh sync-master   # README.md を master へ同期
```

## 構成

Feature-Sliced Design v2.1。単一画面なので `app` / `pages` / `shared` の 3 レイヤのみで、
`features` `entities` `widgets` は作っていない。

```
src/
  app/            エントリ、グローバル CSS
  pages/editor/   画面固有のすべて（ui / model / lib / config）
  shared/         UI kit、汎用ライブラリ、定数
```

- レイヤ座標は画像ピクセル基準で保持し、表示と書き出しで同じ `renderScene()` を
  スケールだけ変えて呼ぶ。見た目と保存結果が一致する。
- ボカシは Canvas の `filter: blur()`。画像の外側を透明として扱う仕様のため、
  縁に接する領域では下の元画像が透ける。先に不透明なモザイクを敷いて防いでいる。
- `ctx.filter` 非対応の環境ではボカシがモザイクへ自動的にフォールバックする。
