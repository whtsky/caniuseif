import { useState, useMemo, useCallback } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn, useDebounce } from '@/lib/utils'
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

  // Debounce the search query to improve performance
  const debouncedSearchQuery = useDebounce(searchQuery, 50)

  // Use useState for tracking the parent node reference
  const [parentNode, setParentNode] = useState<HTMLDivElement | null>(null)

  const filteredFeatures = useMemo(() => {
    return searchFeatures(debouncedSearchQuery)
  }, [debouncedSearchQuery])

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: filteredFeatures.length,
    getScrollElement: () => parentNode,
    estimateSize: () => 35,
    overscan: 10,
  })

  // Callback ref to update the parent node reference
  const refCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setParentNode(node)
    }
  }, [])

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
            <CommandList ref={refCallback} className="max-h-[200px] overflow-auto">
              <CommandEmpty>No features found.</CommandEmpty>
              {value && (
                <CommandItem value="" onSelect={handleClear} className="text-muted-foreground">
                  Clear selection
                </CommandItem>
              )}
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualizer.getVirtualItems()[0]?.start || 0}px)`,
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const feature = filteredFeatures[virtualItem.index]
                    return (
                      <CommandItem
                        key={virtualItem.key}
                        value={feature.id}
                        data-index={virtualItem.index}
                        onSelect={handleSelect}
                        ref={virtualizer.measureElement}
                      >
                        <div className="flex items-start">
                          <Check
                            className={cn('mr-2 h-4 w-4 mt-1', value === feature.id ? 'opacity-100' : 'opacity-0')}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{feature.title}</div>
                            {feature.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {feature.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    )
                  })}
                </div>
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
