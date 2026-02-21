'use client'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  size?: 'sm' | 'md'
  disabled?: boolean
}

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  size = 'md',
  disabled = false,
}: ToggleSwitchProps) {
  const trackSize = size === 'sm' ? 'w-8 h-[18px]' : 'w-10 h-[22px]'
  const thumbSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]'
  const thumbTranslate = size === 'sm' ? 'translate-x-[14px]' : 'translate-x-[18px]'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        group inline-flex items-center gap-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {label && (
        <span className="text-xs text-gray-500 select-none">{label}</span>
      )}
      <span
        className={`
          relative inline-flex flex-shrink-0 ${trackSize} rounded-full
          transition-colors duration-200 ease-in-out
          ${checked
            ? 'bg-teal-500'
            : 'bg-gray-300'
          }
        `}
      >
        <span
          className={`
            inline-block ${thumbSize} rounded-full bg-white shadow-sm
            transform transition-transform duration-200 ease-in-out
            ${checked ? thumbTranslate : 'translate-x-[2px]'}
            mt-[2px]
          `}
        />
      </span>
    </button>
  )
}
