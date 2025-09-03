#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import featuresData from 'caniuse-db/fulldata-json/data-2.0.json'
import bcd, { CompatStatement, Identifier, SupportStatement, SimpleSupportStatement } from '@mdn/browser-compat-data'

// Import shared types
import type { Feature, FeatureData } from '../src/types/compat.js'

// Type definitions for caniuse-db data structure
interface CanIUseAgent {
  version_list: Array<{ version: string; global_usage?: number; release_date?: number }>
}

interface CanIUseFeature {
  title: string
  description?: string
  stats: Record<string, Record<string, string>>
}

interface CanIUseData {
  agents: Record<string, CanIUseAgent>
  data: Record<string, CanIUseFeature>
}

// BCD result structure
interface BCDResult {
  key: string
  origKey: string
  data: CompatStatement
  prefix: string
}

// Map MDN browser IDs to Can I Use browser IDs for consistency
const browserIdMapping: Record<string, string> = {
  chrome: 'chrome',
  chrome_android: 'and_chr',
  firefox: 'firefox',
  firefox_android: 'and_ff',
  safari: 'safari',
  safari_ios: 'ios_saf',
  edge: 'edge',
  ie: 'ie',
  opera: 'opera',
  opera_android: 'op_mob',
  samsung_android: 'samsung',
  webview_android: 'and_uc',
}

const bcdTitleMap: Record<string, string> = {
  api: 'API',
  'css.at-rules': 'CSS at-rule',
  'css.types': 'CSS Types',
  'css.properties': 'CSS Property',
  'css.selectors': 'CSS Selector',
  html: 'HTML',
  http: 'HTTP',
  javascript: 'JavaScript',
  manifests: 'Web App Manifest',
  mathml: 'MathML',
  svg: 'SVG',
  webassembly: 'WebAssembly',
  webdriver: 'WebDriver',
  webextensions: 'Web Extensions',
}

// Convert BCD support data to Can I Use format
function convertBCDSupportToCanIUseStat(agent: string, bcdSupport: SupportStatement): Record<string, string> {
  const versionSupport: Array<{ support: string; version: string }> = []

  // Get all versions for this agent from Can I Use data
  const caniuseData = featuresData as CanIUseData
  const allAgentVersions = caniuseData.agents[agent]?.version_list || []

  // Don't prefill - only add versions where we have actual support information

  function process(bcdSupport: SupportStatement, versionSupport: Array<{ support: string; version: string }>) {
    if (!bcdSupport) return

    // Handle array of support entries
    if (Array.isArray(bcdSupport)) {
      bcdSupport.forEach((subEntry) => process(subEntry, versionSupport))
      return
    }

    // Now we know it's a SimpleSupportStatement
    const supportEntry = bcdSupport as SimpleSupportStatement

    // Feature was never released
    if (supportEntry.version_added === false) return

    // Only process if we have version information
    if (!supportEntry.version_added || typeof supportEntry.version_added !== 'string') {
      return
    }

    // Find the starting version index in the agent's version list
    const startVersionIndex = allAgentVersions.findIndex((v) => v.version === supportEntry.version_added)
    if (startVersionIndex === -1) return

    // Find the ending version index if version_removed is specified
    let endVersionIndex = allAgentVersions.length - 1
    if (supportEntry.version_removed && typeof supportEntry.version_removed === 'string') {
      const removedIndex = allAgentVersions.findIndex((v) => v.version === supportEntry.version_removed)
      if (removedIndex > -1) {
        endVersionIndex = removedIndex - 1
      }
    }

    // Determine support character based on various conditions
    let supportChar = 'y' // Default to full support

    // Check for partial implementation
    if (supportEntry.partial_implementation === true) {
      supportChar = 'a'
    }

    // Check for flag-based support (treat as partial support)
    if (supportEntry.flags && supportEntry.flags.length > 0) {
      supportChar = 'a'
    }

    // Add only the versions that have support
    for (let i = startVersionIndex; i <= endVersionIndex && i < allAgentVersions.length; i++) {
      const version = allAgentVersions[i].version
      // Only add if not already present (avoid duplicates from multiple support entries)
      if (!versionSupport.find((v) => v.version === version)) {
        versionSupport.push({
          support: supportChar,
          version: version,
        })
      }
    }
  }

  process(bcdSupport, versionSupport)

  // Return as object
  return versionSupport.reduce(
    (toReturn, entry) => {
      toReturn[entry.version] = entry.support
      return toReturn
    },
    {} as Record<string, string>,
  )
}

// Normalize HTML in text content
function normalizeHtmlContent(text: string): string {
  if (!text) return text

  return (
    text
      // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Remove HTML tags but keep content
      .replace(/<code>/g, '`')
      .replace(/<\/code>/g, '`')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
  )
}

// Convert BCD entry to minimal format (only essential fields)
function convertBCDEntryToMinimalEntry(bcdResult: BCDResult): FeatureData {
  const { key, origKey, data, prefix } = bcdResult

  // Create a clean title
  let title = data.description || origKey
  title = normalizeHtmlContent(title)

  // Add prefix for context, but keep it clean
  const prefixLabel = bcdTitleMap[prefix] ?? prefix.replace(/\./g, ' ')
  title = `${prefixLabel}: ${title}`

  // Convert BCD browser support to Can I Use format
  const stats: Record<string, Record<string, string>> = {}

  // Map BCD browser data to Can I Use format
  Object.entries(browserIdMapping).forEach(([bcdAgent, caniuseAgent]) => {
    if (data.support && data.support[bcdAgent]) {
      stats[caniuseAgent] = convertBCDSupportToCanIUseStat(caniuseAgent, data.support[bcdAgent])
    }
  })

  const featureData: FeatureData = {
    id: key,
    title,
    description: data.description ? normalizeHtmlContent(data.description) : undefined,
    stats,
  }

  return featureData
}

// Extract MDN features from BCD data (only most popular ones)
function extractMdnFeatures(): Record<string, FeatureData> {
  const mdnFeatures: Record<string, FeatureData> = {}
  let processedCount = 0

  function traverseObject(obj: Identifier, path: string[] = [], depth: number = 0) {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '__compat') {
        const compatData = value as CompatStatement
        const fullPath = path.join('.')

        if (compatData.support) {
          const featureKey = `mdn-${fullPath.replace(/\./g, '_')}`
          const bcdResult = {
            key: featureKey,
            origKey: path[path.length - 1],
            data: compatData,
            prefix: path.slice(0, -1).join('.'),
          }

          mdnFeatures[featureKey] = convertBCDEntryToMinimalEntry(bcdResult)
          processedCount++

          if (processedCount % 1000 === 0) {
            console.log(`Processed ${processedCount} MDN features...`)
          }
        }
      } else {
        traverseObject(value as Identifier, [...path, key], depth + 1)
      }
    }
  }

  console.log('Extracting MDN features...')

  const bcdCategories = ['css', 'html', 'javascript'] as const

  bcdCategories.forEach((category) => {
    console.log(`Processing ${category}...`)
    traverseObject(bcd[category], [category])
  })

  console.log(`Extracted ${Object.keys(mdnFeatures).length} MDN features`)
  return mdnFeatures
}

// Build comprehensive features list and split data
function buildCompatData(): { features: Feature[]; data: Record<string, FeatureData> } {
  console.log('Building compatibility data...')

  // Process Can I Use features - only include essential fields
  console.log('Processing Can I Use features...')
  const caniuseData = featuresData as CanIUseData
  const caniuseFeatures: Feature[] = Object.entries(caniuseData.data).map(([id, dbFeature]) => ({
    id,
    title: dbFeature.title || id,
    description: dbFeature.description,
  }))

  // Process Can I Use data - keep all browser data
  const caniuseCompatData: Record<string, FeatureData> = {}

  Object.entries(caniuseData.data).forEach(([id, feature]) => {
    caniuseCompatData[id] = {
      id,
      title: feature.title || id,
      description: feature.description,
      stats: feature.stats || {},
    }
  })

  console.log(`Found ${caniuseFeatures.length} Can I Use features`)

  // Process MDN features
  const mdnFeatures = extractMdnFeatures()
  const mdnFeaturesAsFeatures: Feature[] = Object.entries(mdnFeatures).map(([id, f]) => ({
    id,
    title: f.title,
    description: f.description,
  }))

  // Combine all features
  const allFeatures = [...caniuseFeatures, ...mdnFeaturesAsFeatures]

  // Create comprehensive data object
  const allFeaturesData = {
    ...caniuseCompatData,
    ...mdnFeatures,
  }

  console.log(`Total features: ${allFeatures.length}`)

  return {
    features: allFeatures, // Only return the features array
    data: allFeaturesData,
  }
}

// Main execution
async function main() {
  console.log('Starting compatibility data build...')

  const { features: featuresMetadata, data: compatData } = buildCompatData()

  // Ensure output directories exist
  const outputDir = path.join(process.cwd(), 'src', 'data')
  const featuresDir = path.join(outputDir, 'features')

  if (fs.existsSync(featuresDir)) {
    fs.rmSync(featuresDir, { recursive: true })
  }
  fs.mkdirSync(featuresDir, { recursive: true })

  // Create main features.json (just the features array)
  const featuresOutputPath = path.join(outputDir, 'features.json')
  console.log('Writing features.json...')
  fs.writeFileSync(featuresOutputPath, JSON.stringify(featuresMetadata, null, 2))

  // Create individual feature files (only store stats, not redundant metadata)
  console.log('Writing individual feature files...')
  let writtenFiles = 0
  const totalFiles = Object.keys(compatData).length

  Object.entries(compatData).forEach(([featureId, featureData]) => {
    const sanitizedId = featureId.replace(/[^a-zA-Z0-9_-]/g, '_')
    const featureFilePath = path.join(featuresDir, `${sanitizedId}.json`)

    // Only store the stats data - id, title, description are redundant since they're in features.json
    const minimalFeatureData = {
      stats: featureData.stats,
    }

    fs.writeFileSync(featureFilePath, JSON.stringify(minimalFeatureData, null, 2))
    writtenFiles++

    if (writtenFiles % 3000 === 0) {
      console.log(`Written ${writtenFiles}/${totalFiles} feature files...`)
    }
  })

  console.log(`✅ Compatibility data built successfully!`)
  console.log(`📁 Main features file: ${featuresOutputPath}`)
  console.log(`📁 Individual feature files: ${featuresDir}`)
  console.log(`📊 Stats:`)
  console.log(`   - Total features: ${featuresMetadata.length}`)
  console.log(`   - Feature files written: ${writtenFiles}`)

  const mainFileSize = (fs.statSync(featuresOutputPath).size / 1024 / 1024).toFixed(2)
  console.log(`   - Main file size: ${mainFileSize} MB`)

  // Calculate average individual file size
  const sampleFeatureFile = path.join(featuresDir, fs.readdirSync(featuresDir)[0])
  const avgFileSize = (fs.statSync(sampleFeatureFile).size / 1024).toFixed(2)
  console.log(`   - Average feature file size: ${avgFileSize} KB`)
}

main().catch(console.error)
