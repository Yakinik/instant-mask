export interface Point {
  x: number
  y: number
}

/** 中心座標・寸法・回転角（ラジアン）で表す矩形領域。 */
export interface Box {
  cx: number
  cy: number
  width: number
  height: number
  rotation: number
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/** 原点まわりに点を回転する。 */
export function rotatePoint(point: Point, angle: number): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }
}

/** ボックスのローカル座標（中心原点・回転なし）へ変換する。 */
export function toLocalPoint(point: Point, box: Box): Point {
  return rotatePoint({ x: point.x - box.cx, y: point.y - box.cy }, -box.rotation)
}

/** 左上から時計回りに 4 隅を返す。 */
export function boxCorners(box: Box): [Point, Point, Point, Point] {
  const hw = box.width / 2
  const hh = box.height / 2
  const local: Point[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ]
  const [nw, ne, se, sw] = local.map((p) => {
    const r = rotatePoint(p, box.rotation)
    return { x: r.x + box.cx, y: r.y + box.cy }
  }) as [Point, Point, Point, Point]
  return [nw, ne, se, sw]
}

/** ボックス全体を等倍拡縮する（表示用スケールと書き出し原寸の変換に使う）。 */
export function scaleBox(box: Box, scale: number): Box {
  return {
    cx: box.cx * scale,
    cy: box.cy * scale,
    width: box.width * scale,
    height: box.height * scale,
    rotation: box.rotation,
  }
}

/** 2 点から回転なしのボックスを作る。 */
export function boxFromPoints(a: Point, b: Point): Box {
  return {
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
    rotation: 0,
  }
}
