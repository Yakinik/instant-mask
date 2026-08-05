import { Button, Icon } from '@/shared/ui'

import {
  canRedo,
  canUndo,
  clearLayers,
  layers,
  openStampPicker,
  redo,
  selectedLayer,
  showFrames,
  undo,
} from '../model/editor'
import { LayerActions } from './LayerActions'
import { MaskSettings } from './MaskSettings'
import { StampSettings } from './StampSettings'
import styles from './Toolbar.module.css'

/**
 * 下部の操作エリア。役割ごとに 3 つのゾーンへ固定し、状態が変わっても順序を変えない。
 *
 *   [ 内容の設定 ] [ 選択中への操作 ] [ 常時のアクション ]
 *
 * 内容の設定は、未選択なら「次に作るマスクの既定」、選択中ならそのレイヤを編集する。
 * どちらも同じコンポーネントを通すので、選択を切り替えても項目の位置が動かない。
 */
export function Toolbar() {
  const selected = selectedLayer.value

  return (
    <div class={styles.bar}>
      <div class={styles.settingsZone}>
        {selected?.kind === 'emoji' ? (
          <StampSettings layer={selected} />
        ) : (
          <MaskSettings layer={selected?.kind === 'mask' ? selected : null} />
        )}
      </div>

      {/* 未選択でも枠だけ残す。畳むと設定ゾーンの幅が変わり、行数が増減して並びが動くため */}
      <div class={styles.layerZone}>
        {selected && <LayerActions layer={selected} />}
      </div>

      <div class={styles.globalZone}>
        {/* 選択中でも「追加」として振る舞う（編集は選択中の設定側から行う） */}
        <Button onClick={() => openStampPicker('add')}>
          <Icon name="plus" />
          絵文字・文字
        </Button>
        <Button
          square
          variant={showFrames.value ? 'default' : 'ghost'}
          title={showFrames.value ? '枠を隠して仕上がりを見る' : '枠を表示して編集に戻る'}
          aria-label={showFrames.value ? '枠を隠す' : '枠を表示'}
          aria-pressed={showFrames.value}
          onClick={() => {
            showFrames.value = !showFrames.value
          }}
        >
          <Icon name="frame" />
        </Button>
        <Button
          square
          variant="ghost"
          title="元に戻す"
          aria-label="元に戻す"
          disabled={!canUndo.value}
          onClick={undo}
        >
          <Icon name="undo" />
        </Button>
        <Button
          square
          variant="ghost"
          title="やり直す"
          aria-label="やり直す"
          disabled={!canRedo.value}
          onClick={redo}
        >
          <Icon name="redo" />
        </Button>
        <Button
          variant="ghost"
          onClick={clearLayers}
          disabled={layers.value.length === 0}
        >
          全消去
        </Button>
      </div>
    </div>
  )
}
