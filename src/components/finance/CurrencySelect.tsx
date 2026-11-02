import type { Ref } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FinanceCurrency } from '@/lib/finance'

const option = 'rounded-lg py-2 pr-8 pl-2.5 data-[state=checked]:font-semibold'

type CurrencySelectProps = {
  id: string
  value: FinanceCurrency
  onChange: (value: FinanceCurrency) => void
  onBlur?: () => void
  ref?: Ref<HTMLButtonElement>
}

/** € or KM, in the app's own dropdown (same as the goal forms). Put it in a floating GoalField labelled "Currency". */
export function CurrencySelect({ id, value, onChange, onBlur, ref }: CurrencySelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as FinanceCurrency)} onOpenChange={(open) => !open && onBlur?.()}>
      <SelectTrigger ref={ref} id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={6} className="glass-menu">
        <SelectItem value="eur" className={option}>
          €
        </SelectItem>
        <SelectItem value="bam" className={option}>
          KM
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
