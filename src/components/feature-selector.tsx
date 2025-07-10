import { useState, useMemo, useCallback } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { searchFeatures, getFeatureTitle } from '@/services/caniuseService'

interface FeatureSelectorProps {
  value?: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  label?: string
}

export function FeatureSelector({
  value,
  onValueChange,
  placeholder = 'Select a feature...',
  label,
}: FeatureSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFeatures = useMemo(() => {
    return searchFeatures(searchQuery)
  }, [searchQuery])

  const handleSelect = useCallback(
    (currentValue: string) => {
      const newValue = currentValue === value ? null : currentValue
      onValueChange(newValue)
      setOpen(false)
    },
    [value, onValueChange],
  )

  const handleClear = useCallback(() => {
    onValueChange(null)
    setOpen(false)
  }, [onValueChange])

  return (
    <div className="relative">
      {label && <label className="text-sm font-medium text-gray-900 mb-2 block">{label}</label>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label || 'Select a web feature'}
            className="w-full justify-between text-left font-normal"
          >
            <span className="truncate">{value ? getFeatureTitle(value) : placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search web features..." value={searchQuery} onValueChange={setSearchQuery} />
            <CommandList>
              <CommandEmpty>No features found.</CommandEmpty>
              {value && (
                <CommandItem value="" onSelect={handleClear} className="text-muted-foreground">
                  Clear selection
                </CommandItem>
              )}
              {filteredFeatures.map((feature) => (
                <CommandItem key={feature.id} value={feature.id} onSelect={handleSelect}>
                  <div className="flex items-start">
                    <Check className={cn('mr-2 h-4 w-4 mt-1', value === feature.id ? 'opacity-100' : 'opacity-0')} />
                    <div>
                      <div className="font-medium">{feature.title}</div>
                      {feature.description && (
                        <div className="text-xs text-muted-foreground mt-1">{feature.description}</div>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
