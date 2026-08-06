# ライセンス表記の整備

## 要求

GitHub Pages で公開するにあたり、利用ライブラリのライセンスがクリアできているかを確認し、
必要な明記を行う。作業中にバンドル上限を 30KB へ緩和する指示を受けた。

## 調査結果

公開バンドルに含まれるサードパーティコードは 3 つだけで、いずれも MIT。
コピーレフト（GPL / AGPL）はゼロ。公開を妨げるものはない。

| パッケージ | ライセンス | 著作権者 |
| --- | --- | --- |
| preact 10.29.8 | MIT | Jason Miller |
| @preact/signals 2.11.0 | MIT | Preact Team |
| @preact/signals-core 1.14.4 | MIT | Preact Team |

devDependencies（typescript = Apache-2.0、lightningcss = MPL-2.0 ほか）はビルド時のみで
成果物に入らない。MPL-2.0 の義務は lightningcss 自体を改変再配布する場合に生じるもので、
ツールの出力には及ばない。

対応が要るのは 2 点だった。

1. MIT の著作権表示が公開バンドルに残っていない（preact の配布 ESM 自体にヘッダがない）
2. このプロジェクト自身のライセンスが未指定（無指定 = 全著作権保有）

## タスク

- [x] `LICENSE` — MIT を追加
- [x] `package.json` — `license` フィールド
- [x] `vite.config.ts` — バンドル先頭の banner（MIT 全文）
- [x] `README.md` — ライセンス節
- [x] `scripts/tbp.sh` — `LICENSE` を master 同期対象に追加
- [x] バンドル上限を 25KB → 30KB に緩和（`CLAUDE.md` / publish-site skill）
- [x] `npm run build` とサイズ確認（25.68KB / 上限 30KB）
- [ ] 公開

## レビュー

### 1. banner が minify で消える問題

`build.rollupOptions.output.banner` に MIT 全文を置いたが、最初のビルドでは出力が
**1 バイトも変わらなかった**（ハッシュも同一）。`--minify false` で試すと banner が
出たので、minifier が落としていると判明。

原因は Vite 側の既定値だった（`vite/dist/node/chunks/node.js:33603`）。

```js
comments: typeof output.comments === "boolean" ? output.comments : {
  annotation: !options.minify || ...,
  jsdoc: !options.minify,
  legal: !options.minify,   // ← minify 時は legal コメントも落とす
  ...output.comments
},
```

`/*!` は legal comment として通常は保持されるが、Vite は minify 時に `legal: false` を
渡している。`...output.comments` が後ろにあるのでユーザー指定で上書きできる。

```ts
output: {
  banner: NOTICE,
  comments: { legal: true },
}
```

なお最初は `output.minify` に `{ codegen: { legalComments: 'inline' } }` を渡そうとしたが、
これは compress / mangle の既定値まで置き換えるため採らなかった。`comments` だけを
上書きするほうが影響範囲が小さい。

### 2. 全文をバンドルに入れた判断

当初は上限 25KB（残り 0.23KB）だったため、短い banner + `THIRD-PARTY-NOTICES.txt` を
別置きしてリンクする案だった。上限が 30KB になったので、**全文を banner に直接入れる**方式に
変更した。MIT の「複製に notice を含める」条件を配布物そのもので満たせ、ファイルの
二重管理もなくなる。preact と @preact/signals は同一の MIT 本文なので、著作権者を 2 行
並べて本文は 1 回だけ引用している。

### 3. master への LICENSE 同期

`master` はデフォルトブランチであり、GitHub はここを見てリポジトリのライセンスを判定する。
`LICENSE` が develop にしかないと GitHub 上で認識されず、README の相対リンクも壊れるため、
`tbp.sh` の `MAIN_PATHS` を `README.md LICENSE` に変更した。

### 4. 絵文字について

Web フォントを同梱していないため、フォントの再配布ライセンスは発生しない。保存画像には
端末のフォントグリフが焼き込まれるが、ユーザー自身の端末で正規保有のフォントを使った描画で、
アプリは何も配布していない。README にもその旨を 1 行残した。

### バンドルサイズ（gzip）

| | 変更前 | 変更後 |
| --- | ---: | ---: |
| JS | 21.25KB | 22.16KB |
| CSS | 2.88KB | 2.88KB |
| HTML | 0.64KB | 0.64KB |
| **合計** | **24.77KB** | **25.68KB** |

増分は 0.91KB（MIT 全文の banner）。上限 30KB に対して残り 4.3KB。
