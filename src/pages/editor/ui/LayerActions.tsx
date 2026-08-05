import { Button, Icon } from '@/shared/ui'

import {
  layers,
  moveLayer,
  pushHistory,
  removeLayer,
  selectedLayerIndex,
  updateLayer,
} from '../model/editor'
import type { Layer } from '../model/layer'

/** 選択中のレイヤに対する操作。並びは常にこの順で固定する。 */
export function LayerActions({ layer }: { layer: Layer }) {
  // 配列の末尾ほど前面。端では移動ボタンを無効にする
  const index = selectedLayerIndex.value

  return (
    <>
      <Button
        square
        variant="ghost"
        title="背面へ"
        aria-label="背面へ"
        disabled={index <= 0}
        onClick={() => moveLayer(layer.id, -1)}
      >
        <Icon name="back" />
      </Button>
      <Button
        square
        variant="ghost"
        title="前面へ"
        aria-label="前面へ"
        disabled={index < 0 || index >= layers.value.length - 1}
        onClick={() => moveLayer(layer.id, 1)}
      >
        <Icon name="front" />
      </Button>
      <Button
        variant="ghost"
        disabled={layer.rotation === 0}
        onClick={() => {
          pushHistory()
          updateLayer(layer.id, { rotation: 0 })
        }}
      >
        回転を戻す
      </Button>
      <Button variant="danger" onClick={() => removeLayer(layer.id)}>
        <Icon name="trash" />
        削除
      </Button>
    </>
  )
}
