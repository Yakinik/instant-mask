# instant-mask 実装計画

ブラウザ完結の画像マスクツール。画像にボカシ／モザイクを掛け、絵文字を乗せ、拡縮・回転できる。
GitHub Pages で公開する。

## 決定事項

- スタック: Vite + Preact + @preact/signals + CSS Modules + TypeScript
- アーキテクチャ: Feature-Sliced Design v2.1（Pages First。`widgets/` `entities/` は作らない）
- マスク: ボカシ／モザイク × 矩形／楕円、強度可変
- 絵文字: カテゴリ別プリセット（OS ネイティブ絵文字を Canvas 描画。Web フォント読み込みゼロ）
- ブランチ: `master`（README のみ） / `develop`（開発・SSOT） / `pages`（公開ファイルのみ）
- リポジトリ: `Yakinik/instant-mask`（public）
- 外部通信ゼロ。画像はすべてブラウザ内で処理する

## タスク

### 1. 基盤

- [x] `git init -b develop`、ローカル `user.name` / `user.email` 設定
- [x] 依存の互換性確認（vite 8 / TypeScript 7 / preact / signals）
- [x] `package.json` / `vite.config.ts` / `tsconfig.json` / `index.html` / `.gitignore`
- [x] `base: '/instant-mask/'`（Pages のサブパス配信に対応）

### 2. shared レイヤ

- [x] `shared/lib/geometry.ts` — 点の回転、ローカル座標変換、2 点からのボックス生成
- [x] `shared/lib/image-file.ts` — File / クリップボード → ImageBitmap（EXIF 向き対応）
- [x] `shared/lib/canvas-effect.ts` — クリップ・ボカシ・モザイクの Canvas プリミティブ
- [x] `shared/lib/download.ts` — Canvas → Blob → ダウンロード
- [x] `shared/lib/class-name.ts` — クラス名結合
- [x] `shared/ui/` — Button / Icon / Slider / SegmentedControl（最小の UI kit）
- [x] `shared/config/app.ts` — アプリ定数

### 3. pages/editor レイヤ

- [x] `model/editor.ts` — signals（画像・レイヤ・選択・既定設定・履歴）
- [x] `model/layer.ts` / `model/mask.ts` / `model/emoji.ts` — レイヤの型と生成
- [x] `lib/scene.ts` — 画像＋レイヤの合成描画（表示用・書き出し用で共通）
- [x] `lib/pointer-gesture.ts` — 移動／拡縮／回転のポインタ計算
- [x] `lib/export-image.ts` — 原寸で再描画して保存
- [x] `lib/image-input.ts` — ダイアログ／ドロップ／貼り付けの受け口
- [x] `config/emoji-presets.ts` / `config/mask-options.ts`
- [x] `ui/` — EditorPage / DropZone / Stage / LayerFrame / Toolbar / LayerInspector / EmojiPicker

### 4. app レイヤ

- [x] `app/global.css` — リセットと CSS 変数（ライト／ダーク対応）
- [x] `app/App.tsx` / `app/main.tsx`

### 5. 検証

- [x] `npm run build` が通り、型エラーがない
- [x] バンドルサイズ確認（gzip 19.0KB）
- [x] ブラウザ実機確認（読み込み → マスク → 絵文字 → 拡縮回転 → Undo/Redo → 書き出し）
- [x] 画像の縁に接するマスクで元画像が透けないことを確認（アルファ最小値 255）
- [x] ライト／ダーク両テーマの表示確認

### 6. 公開

- [x] `README.md`（master 用の簡潔な説明）/ `docs/development.md`（develop 用）
- [x] `scripts/tbp.sh`（publish / sync-master）
- [x] `gh repo create Yakinik/instant-mask --public`
- [x] `develop` / `master` / `pages` を push
- [x] デフォルトブランチを master に変更、Pages を pages ブランチで有効化
- [x] 公開 URL の疎通確認（本番でも読み込み → マスク作成まで動作確認済み）

## レビュー

### 成果物

`https://yakinik.github.io/instant-mask/`

- 画像読み込み: ファイル選択 / ドラッグ&ドロップ / クリップボード貼り付け
- マスク: ボカシ・モザイク × 四角・丸、強さスライダー。画像上のドラッグで範囲指定
- 絵文字: 8 カテゴリ 96 個のプリセット（OS ネイティブ絵文字を Canvas 描画）
- 操作: ドラッグ移動、ハンドルで拡縮（絵文字は比率固定）、回転（Shift で 15° スナップ）、
  Undo / Redo、レイヤ削除、全消去
- 書き出し: 元解像度のまま PNG / JPEG。Canvas 経由なので EXIF は残らない
- 外部通信ゼロ

### バンドルサイズ

| ファイル | raw | gzip |
| --- | ---: | ---: |
| index.html | 0.93 KB | 0.62 KB |
| CSS | 7.91 KB | 2.38 KB |
| JS | 40.41 KB | 16.02 KB |
| **合計** | **49.25 KB** | **19.02 KB** |

Web フォント・アイコンフォント・画像アセットはゼロ。依存は preact / @preact/signals のみ。

### アーキテクチャ

FSD v2.1 の Pages First に従い `app/` + `pages/editor/` + `shared/` の 3 レイヤ。
単一画面なので `features/` `entities/` `widgets/` は作らず、画面固有のロジックは
`pages/editor/` のセグメント（ui / model / lib / config）で分割した。

### 判断が必要だった点

1. **公開スクリプト**: グローバルスキルの `tbp.sh` は develop のパス構造をそのまま公開ブランチに
   再現する仕様のため、Vite の `dist/` を公開ルートに置けない。同じ設計思想（一時 worktree・
   orphan ブランチ・冪等・主作業ツリーは develop のまま）で `dist/` の中身をルートへ展開する
   `scripts/tbp.sh` をリポジトリ内に持たせ、外部依存なしで再現できるようにした。
   公開対象はビルド成果物のみなので `.pages-manifest` は使っていない。
2. **ボカシの縁の透け**: Canvas の `filter: blur()` は画像の外側を透明として扱うため、
   画像の縁に接する領域では下に描かれた元画像が透ける（マスクとして破綻する）。
   クリップ後にまず不透明な粗いモザイクを敷き、その上にボカシを重ねることで解決した。
   書き出し画像のアルファ最小値が 255 であることを実機で確認済み。
3. **ボカシの既定強度**: 当初の係数では強さ 50 で文字の輪郭が読めたため、係数を 2 倍にした
   （強さ 50 = 領域短辺の 1/3 の半径）。
4. **ビルド設定**: Vite 8 は Oxc ベースのため JSX 設定は `esbuild` ではなく `oxc` に指定する。
   TypeScript 7 では `baseUrl` が廃止されたため `paths` を相対指定にした。
