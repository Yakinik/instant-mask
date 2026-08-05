import { type LayerBase, createLayerId } from './layer'

export interface EmojiLayer extends LayerBase {
  kind: 'emoji'
  char: string
}

export function createEmojiLayer(
  char: string,
  cx: number,
  cy: number,
  size: number,
): EmojiLayer {
  return {
    id: createLayerId(),
    kind: 'emoji',
    char,
    cx,
    cy,
    width: size,
    height: size,
    rotation: 0,
  }
}
