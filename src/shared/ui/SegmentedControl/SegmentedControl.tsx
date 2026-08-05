import { cx } from '../../lib/class-name'
import styles from './SegmentedControl.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  title?: string
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  class?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  class: className,
}: SegmentedControlProps<T>) {
  return (
    <div class={cx(styles.group, className)} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          title={option.title ?? option.label}
          class={cx(styles.item, option.value === value && styles.active)}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
