import { useState, useMemo } from "react"
import { Search, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { getFeaturesList, searchFeatures } from "../services/caniuseService"

interface FeatureOption {
  id: string
  title: string
}

interface FeatureSelectorProps {
  value?: FeatureOption | null
  onValueChange: (value: FeatureOption | null) => void
  placeholder?: string
  label?: string
}

export function FeatureSelector({
  value,
  onValueChange,
  placeholder = "Select a feature...",
  label
}: FeatureSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const allFeatures = useMemo(() => getFeaturesList(), [])
  
  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return allFeatures
    return searchFeatures(searchQuery)
  }, [searchQuery, allFeatures])

  const handleSelect = (feature: FeatureOption) => {
    onValueChange(feature)
    setOpen(false)
    setSearchQuery("")
  }

  const handleClear = () => {
    onValueChange(null)
    setSearchQuery("")
  }

  return (
    <div className="relative">
      {label && (
        <label className="text-sm font-medium text-gray-900 mb-2 block">
          {label}
        </label>
      )}
      
      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
          onClick={() => setOpen(!open)}
        >
          <span className="truncate">
            {value ? value.title : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white text-gray-900 shadow-md">
            <div className="flex items-center border-b border-gray-200 px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500"
                placeholder="Search web features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="max-h-48 overflow-auto">
              {value && (
                <div
                  className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 border-b border-gray-200"
                  onClick={handleClear}
                >
                  <span className="text-gray-600">Remove this selection</span>
                </div>
              )}
              
              {filteredFeatures.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-600">
                  No features found.
                </div>
              ) : (
                filteredFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className={cn(
                      "relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100",
                      value?.id === feature.id && "bg-gray-100"
                    )}
                    onClick={() => handleSelect(feature)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === feature.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{feature.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
