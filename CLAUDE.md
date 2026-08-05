# CLAUDE.md

ブラウザ完結の画像マスクツール。Vite + Preact + @preact/signals + CSS Modules + TypeScript。

## コミット

- identity は `Yakinik <1999233+Yakinik@users.noreply.github.com>`。リポジトリローカルに
  設定済み。個人の実メールアドレスでコミットしない。clone し直したときは
  `git config user.email` を設定してから作業する。
- `git add -A` / `git add .` は使わない（ユーザー設定で禁止されている）。パスを明示する。

## ブランチ運用

| ブランチ | 役割 |
| --- | --- |
| `master` | README.md だけの情報掲示ブランチ（デフォルト） |
| `develop` | ソース一式。編集はここだけで行う |
| `pages` | ビルド成果物だけの公開ブランチ（GitHub Pages の配信元） |

- `master` / `pages` は `scripts/tbp.sh` が一時 worktree 経由で全内容を再構成する管理対象。
  手動でコミットを積まない（次回の同期で消える）。
- 主作業ツリーで `master` / `pages` へ `git switch` しない。必要に見える作業はすべて
  `scripts/tbp.sh` の担当。
- 公開は外部公開行為。`scripts/tbp.sh publish` はユーザーの確認を取ってから実行する。

## アーキテクチャ

Feature-Sliced Design v2.1。`app` / `pages/editor` / `shared` の 3 レイヤのみ。

- `features` `entities` `widgets` は作らない。画面固有のものは `pages/editor` のセグメント
  （ui / model / lib / config）に置く。同じコードが実際に複数箇所で使われるまで抽出しない。
- import は下位レイヤのみ。スライス外からは公開 API（`index.ts`）経由で参照する。
- ファイル名はドメイン基準。`types.ts` `utils.ts` のような技術的役割名は使わない。
- `shared` に業務ロジックを置かない（汎用の描画・幾何・DOM 操作まで）。

## 軽量方針

公開バンドルは **gzip 20KB 以内**を上限とする（現在 19.0KB）。

- 依存を増やさない。UI ライブラリ、アイコンライブラリ、画像処理ライブラリは使わない。
- Web フォント・アイコンフォント・画像アセットを追加しない。アイコンはインライン SVG、
  絵文字は OS ネイティブフォントを Canvas に描画する。
- `npm run build` の出力サイズを毎回確認する。上限を超えるなら実装を見直す。

## 実装上の注意

- レイヤ座標は画像ピクセル基準で保持する。表示と書き出しは同じ `renderScene()` を
  スケールだけ変えて呼ぶので、見た目と保存結果が一致する。この構造を崩さない。
- ボカシは Canvas の `filter: blur()`。画像の外側を透明として扱う仕様のため、画像の縁に
  接する領域では**下に描かれた元画像が透ける**。クリップ後にまず不透明な粗いモザイクを
  敷き、その上にボカシを重ねること（`lib/scene.ts` の `drawMask`）。順序を崩すと
  マスクとして破綻する。
- `ctx.filter` 非対応環境ではモザイクへ自動フォールバックする（`supportsCanvasFilter()`）。
- Vite 8 は Oxc ベース。JSX 設定は `esbuild` ではなく `oxc` に書く。
- TypeScript 7 では `baseUrl` が使えない。`paths` は `./src/*` のように相対で書く。

## 検証

- `npm run build`（型チェック込み）が通ること。
- UI を変えたら実機で確認する: 画像読み込み → マスク作成 → 絵文字配置 → 拡縮・回転 →
  Undo/Redo → 保存。**画像の縁に接するマスクで元画像が透けないこと**も必ず見る。
