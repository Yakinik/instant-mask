const PATHS = {
  undo: 'M8 6 3 11l5 5M3 11h11a6 6 0 0 1 0 12h-3',
  redo: 'M16 6l5 5-5 5M21 11H10a6 6 0 0 0 0 12h3',
  trash: 'M4 7h16M9 7V4h6v3M10 11v7M14 11v7M6 7l1 13h10l1-13',
  download: 'M12 3v12M7 11l5 5 5-5M4 20h16',
  image: 'M4 5h16v14H4zM4 16l4-4 3 3 4-4 5 5',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  frame: 'M4 9V5h4M15 5h4v4M20 15v4h-4M9 19H5v-4',
  front: 'M12 20V5M6 11l6-6 6 6',
  back: 'M12 4v15M6 13l6 6 6-6',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
