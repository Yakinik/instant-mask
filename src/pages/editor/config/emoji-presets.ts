/** OS 内蔵の絵文字フォントだけを使う。Web フォントは読み込まない。 */
export const EMOJI_FONT_STACK =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif'

export interface EmojiCategory {
  name: string
  items: readonly string[]
}

export const EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  {
    name: '隠す',
    items: ['🫥', '😶‍🌫️', '🙈', '🤐', '🥸', '🕶️', '😷', '🎭', '⬛️', '🔲', '🔳', '❓'],
  },
  {
    name: '笑顔',
    items: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇'],
  },
  {
    name: '表情',
    items: ['😍', '🤩', '😘', '😋', '😜', '🤪', '🤔', '😐', '🙄', '😴', '😵', '🥶'],
  },
  {
    name: '手',
    items: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '👏', '🙌', '🙏', '💪', '👋', '🫵'],
  },
  {
    name: '記号',
    items: ['❤️', '💔', '💯', '✅', '❌', '⭕️', '❗️', '⚠️', '🚫', '🔒', '🔑', '💤'],
  },
  {
    name: '動物',
    items: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸'],
  },
  {
    name: '食べ物',
    items: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍓', '🍒', '🥑', '🍕', '🍔', '🍣', '🍰'],
  },
  {
    name: 'その他',
    items: ['⭐️', '✨', '⚡️', '🔥', '💥', '🌈', '☀️', '🌙', '⛄️', '🎉', '🎈', '🚀'],
  },
]
