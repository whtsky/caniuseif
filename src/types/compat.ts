// Shared types for the compatibility data

export type SupportLevel = 'full' | 'partial' | 'none'

// Feature interface
export interface Feature {
  id: string
  title: string
  description?: string
}

// Browser support information
export interface BrowserSupport {
  browserId: string
  version: string
  support: string
  supportLevel: SupportLevel
}

// Compatibility check result
export interface CompatibilityResult {
  compatible: SupportLevel
  details: {
    baseFeatureBrowsers: BrowserSupport[]
    targetFeatureSupport: BrowserSupport[]
    overlappingSupport: BrowserSupport[]
    fullSupportPercentage: number
    partialSupportPercentage: number
  }
}

// Feature data in Can I Use format (minimal - only what we need)
export interface FeatureData {
  id: string
  title: string
  description?: string
  stats: Record<string, Record<string, string>> // This is the main data we need
}
