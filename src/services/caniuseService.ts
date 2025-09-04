import featuresData from '../data/features.json'
import Fuse from 'fuse.js'

// Import shared types
import type { Feature, SupportLevel, BrowserSupport, CompatibilityResult, FeatureData } from '@/types/compat'

// Browser name mapping for consistent display
const browserNames: Record<string, string> = {
  chrome: 'Chrome',
  firefox: 'Firefox',
  safari: 'Safari',
  edge: 'Edge',
  ie: 'IE',
  opera: 'Opera',
  ios_saf: 'iOS Safari',
  and_chr: 'Android Chrome',
  and_ff: 'Android Firefox',
  samsung: 'Samsung Internet',
  op_mob: 'Opera Mobile',
  and_uc: 'Android UC Browser',
}

// Initialize the search index for features
let searchIndex: Fuse<Feature> = new Fuse(featuresData, {
  includeScore: true,
  keys: ['title', 'description', 'id'],
})

/** Search for features */
export function searchFeatures(query: string): Feature[] {
  if (!query.trim()) {
    return featuresData
  }

  const results = searchIndex.search(query)
  return results.map((result) => result.item)
}

/** Get feature by ID (with dynamic loading) */
export async function getFeature(featureId: string): Promise<FeatureData | null> {
  try {
    // Sanitize feature ID for file name (same logic as build script)
    const sanitizedId = featureId.replace(/[^a-zA-Z0-9_-]/g, '_')
    const featureModule = await import(`../data/features/${sanitizedId}.json`)
    const minimalData = featureModule.default

    // Get metadata from the main features array
    const featureMetadata = featuresData.find((f) => f.id === featureId)
    if (!featureMetadata) {
      console.warn(`Feature metadata not found for ${featureId}`)
      return null
    }

    // Reconstruct full FeatureData object
    const featureData: FeatureData = {
      id: featureId,
      title: featureMetadata.title,
      description: featureMetadata.description,
      stats: minimalData.stats,
    }

    return featureData
  } catch (error) {
    console.warn(`Failed to load feature data for ${featureId}:`, error)
    return null
  }
}

/** Get feature title by ID */
export function getFeatureTitle(featureId: string): string | null {
  const feature = featuresData.find((f) => f.id === featureId)
  return feature?.title || null
}

/** Get browser support data for a feature */
export async function getBrowserSupportData(featureId: string): Promise<BrowserSupport[]> {
  const feature = await getFeature(featureId)
  if (!feature || !feature.stats) {
    return []
  }

  const supportData: BrowserSupport[] = []

  // Convert stats to BrowserSupport format
  Object.entries(feature.stats).forEach(([browserId, versions]) => {
    Object.entries(versions as Record<string, string>).forEach(([version, support]) => {
      let supportLevel: SupportLevel = 'none'

      if (support === 'y') {
        supportLevel = 'full'
      } else if (support === 'a' || support === 'p') {
        supportLevel = 'partial'
      } else if (support === 'n') {
        supportLevel = 'none'
      }

      supportData.push({
        browserId,
        version,
        support,
        supportLevel,
      })
    })
  })

  return supportData
}

/** Check compatibility between a base feature and target feature */
export async function checkCompatibility(baseFeatureId: string, targetFeatureId: string): Promise<CompatibilityResult> {
  // Get browser support for base feature (browsers that support this feature)
  const baseSupportData = await getBrowserSupportData(baseFeatureId)

  // Filter to only browsers/versions that fully support the base feature
  const supportingBrowsers = baseSupportData.filter((support) => support.supportLevel === 'full')

  // Get browser support for target feature
  const targetSupportData = await getBrowserSupportData(targetFeatureId)
  const targetSupportMap = new Map<string, BrowserSupport>()

  targetSupportData.forEach((support) => {
    const key = `${support.browserId}-${support.version}`
    targetSupportMap.set(key, support)
  })

  // Check overlapping support
  const overlappingSupport: BrowserSupport[] = []
  let fullSupportCount = 0
  let partialSupportCount = 0
  let noSupportCount = 0

  supportingBrowsers.forEach((baseSupport) => {
    const key = `${baseSupport.browserId}-${baseSupport.version}`
    const targetSupport = targetSupportMap.get(key)

    if (targetSupport) {
      overlappingSupport.push(targetSupport)
      switch (targetSupport.supportLevel) {
        case 'full':
          fullSupportCount++
          break
        case 'partial':
          partialSupportCount++
          break
        default:
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
      targetFeatureSupport: targetSupportData,
      overlappingSupport,
      fullSupportPercentage,
      partialSupportPercentage,
    },
  }
}

/** Get browser name by id */
export function getBrowserName(browserId: string): string {
  return browserNames[browserId] ?? browserId
}
