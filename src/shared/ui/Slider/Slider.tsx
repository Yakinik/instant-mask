import { cx } from '../../lib/class-name'
import styles from './Slider.module.css'

export interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  valueText?: string
  onInput: (value: number) => void
  class?: string
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  valueText,
  onInput,
  class: className,
}: SliderProps) {
  return (
    <label class={cx(styles.field, className)}>
      <span class={styles.head}>
        <span>{label}</span>
        <span class={styles.value}>{valueText ?? String(value)}</span>
      </span>
      <input
        type="range"
        class={styles.range}
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(event) => onInput(Number(event.currentTarget.value))}
      />
    </label>
  )
}
