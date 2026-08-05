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

公開バンドルは **gzip 25KB 以内**を上限とする（現在 24.0KB）。
上限に達したら、まず実装を見直す。それでも収まらないときはユーザーに相談すること
（勝手に上限を引き上げない）。

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
- 画像ビューの拡大（`lib/viewport-gesture.ts`）では、Canvas の解像度を **原寸 × DPR** で
  頭打ちにする。倍率に比例させると大きな画像を拡大したときにメモリを食うだけで、
  元画像以上の情報は得られない。
- ズームのジェスチャは `.stage` の `touch-action: none` とポインタ 2 本の距離比・中点で
  自前処理している。1 本目でマスクのドラッグが始まっていても、2 本目が触れたら
  ドラフトを破棄してピンチへ切り替える。
- Vite 8 は Oxc ベース。JSX 設定は `esbuild` ではなく `oxc` に書く。
- TypeScript 7 では `baseUrl` が使えない。`paths` は `./src/*` のように相対で書く。
- CSS Modules の `styles.foo` は `string | undefined` になる。`exactOptionalPropertyTypes`
  が有効なので、UI kit の `class` prop は `string | undefined` と書く（`string` では渡せない）。
- 編集状態の保存には **IndexedDB** を使う（`shared/lib/idb-store.ts`）。localStorage は 5MB 制限で
  画像を入れられない。スタンプ履歴のように小さいものだけ localStorage を使う。
- モザイクは領域の外接矩形を基準にセルを切る（`drawPixelatedRegion`）。画像全体を分割してから
  切り抜くと、粗さを変えるたびにセル境界の位相がずれて見た目が行き来する。
- ぼかしの下敷きモザイクは強さから独立させる。連動させるとセル数が整数で跳ね、
  ぼかしの変化が段階的に見える。

## プロセスの停止

**`pkill -f vite` のようなパターンマッチでプロセスを一括終了しない。** 他のセッションや
他プロジェクトで動いている開発サーバーまで巻き添えで落ちる（実際に事故を起こした）。

- バックグラウンドで起動した開発サーバーは、その起動タスクを止めて終了させる
- 直接止めるときは `lsof -nP -iTCP:<port> -sTCP:LISTEN` で PID を特定し、
  そのコマンドラインがこのリポジトリのパスであることを確認してから `kill <pid>` する
- `killall` も同様に使わない

## 検証

- `npm run build`（型チェック込み）が通ること。
- UI を変えたら実機で確認する: 画像読み込み → マスク作成 → 絵文字配置 → 拡縮・回転 →
  Undo/Redo → 保存。**画像の縁に接するマスクで元画像が透けないこと**も必ず見る。
