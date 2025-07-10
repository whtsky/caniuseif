import featuresData from 'caniuse-db/fulldata-json/data-2.0.json'
import Fuse from 'fuse.js'

export type SupportLevel = 'full' | 'partial' | 'none'

// Enhanced feature interface with description
export interface Feature {
  id: string
  title: string
  description?: string
}

// Type definitions
export interface BrowserSupport {
  browserId: string
  version: string
  support: string
  supportLevel: SupportLevel
}

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

export const featuresList: Feature[] = Object.entries((featuresData as any).data).map(
  ([id, dbFeature]: [string, any]) => {
    return {
      id,
      title: dbFeature.title || id,
      description: dbFeature.description,
    }
  },
)
const fuse = new Fuse(featuresList, {
  includeScore: true,
  keys: ['title', 'description', 'id'],
})

export function getFeature(featureId: string): Feature | undefined {
  return (featuresData as any).data[featureId]
}

export function getFeatureTitle(featureId: string): string {
  const feature = getFeature(featureId)
  return feature?.title || featureId
}

export function searchFeatures(query: string): Feature[] {
  if (!query) {
    return featuresList
  }
  return fuse.search(query).map((result) => result.item)
}

function parseSupportLevel(supportString: string): SupportLevel {
  if (!supportString || supportString === 'n') return 'none'
  if (supportString === 'y') return 'full'
  if (supportString.includes('a') || supportString.includes('x')) return 'partial'
  return 'none'
}

// Get browser support data with enhanced browser information
function getBrowserSupportData(feature: any): BrowserSupport[] {
  const supportData: BrowserSupport[] = []

  Object.entries(feature.stats).forEach(([browserId, versions]: [string, any]) => {
    Object.entries(versions).forEach(([version, support]: [string, any]) => {
      supportData.push({
        browserId,
        version,
        support,
        supportLevel: parseSupportLevel(support),
      })
    })
  })

  return supportData
}

/** Check compatibility between two features  */
export function checkCompatibility(baseFeatureId: string, targetFeatureId: string): CompatibilityResult | null {
  const baseFeature = getFeature(baseFeatureId)
  const targetFeature = getFeature(targetFeatureId)

  if (!baseFeature || !targetFeature) {
    return null
  }

  const baseBrowserSupport = getBrowserSupportData(baseFeature)
  const targetBrowserSupport = getBrowserSupportData(targetFeature)

  // Find browsers that support the base feature
  const supportingBrowsers = baseBrowserSupport.filter(
    (support) => support.supportLevel === 'full' || support.supportLevel === 'partial',
  )

  // Check target feature support for these browsers
  const overlappingSupport: BrowserSupport[] = []
  let fullSupportCount = 0
  let partialSupportCount = 0
  let noSupportCount = 0

  supportingBrowsers.forEach((baseSupport) => {
    const targetSupport = targetBrowserSupport.find(
      (ts) => ts.browserId === baseSupport.browserId && ts.version === baseSupport.version,
    )

    if (targetSupport) {
      overlappingSupport.push(targetSupport)

      switch (targetSupport.supportLevel) {
        case 'full':
          fullSupportCount++
          break
        case 'partial':
          partialSupportCount++
          break
        case 'none':
          noSupportCount++
          break
      }
    } else {
      // No data means no support
      noSupportCount++
      overlappingSupport.push({
        browserId: baseSupport.browserId,
        version: baseSupport.version,
        support: 'n',
        supportLevel: 'none',
      })
    }
  })

  const totalCount = supportingBrowsers.length
  const fullSupportPercentage = totalCount > 0 ? (fullSupportCount / totalCount) * 100 : 0
  const partialSupportPercentage = totalCount > 0 ? (partialSupportCount / totalCount) * 100 : 0

  // Determine compatibility
  let compatible: SupportLevel

  if (fullSupportPercentage >= 100) {
    compatible = 'full'
  } else if (fullSupportPercentage + partialSupportPercentage >= 70) {
    compatible = 'partial'
  } else {
    compatible = 'none'
  }

  return {
    compatible,
    details: {
      baseFeatureBrowsers: supportingBrowsers,
      targetFeatureSupport: targetBrowserSupport,
      overlappingSupport,
      fullSupportPercentage,
      partialSupportPercentage,
    },
  }
}

/** Get browser name by id */
export function getBrowserName(browserId: string): string {
  const browser = (featuresData as any).agents[browserId]
  return browser?.browser || browserId
}
