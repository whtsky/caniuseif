import { useState, useEffect } from 'react'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import { CompatibilityResult, BrowserSupport, SupportLevel } from '@/types/compat'
import { getBrowserName, getFeature, getFeatureTitle } from '@/services/caniuseService'
import { CanIUseLearnMoreButton } from './caniuse-learn-more-button'

const generateSummaryText = (
  result: CompatibilityResult,
  baseFeatureTitle: string,
  targetFeatureTitle: string,
): string => {
  const { fullSupportPercentage, partialSupportPercentage } = result.details

  if (fullSupportPercentage >= 100) {
    return `${Math.round(fullSupportPercentage)}% of browsers supporting "${baseFeatureTitle}" also fully support "${targetFeatureTitle}".`
  } else if (fullSupportPercentage + partialSupportPercentage >= 70) {
    return `${Math.round(
      fullSupportPercentage + partialSupportPercentage,
    )}% of browsers supporting "${baseFeatureTitle}" have at least partial support for "${targetFeatureTitle}".`
  } else {
    return `Only ${Math.round(
      fullSupportPercentage + partialSupportPercentage,
    )}% of browsers supporting "${baseFeatureTitle}" support "${targetFeatureTitle}". Consider alternative approaches.`
  }
}

interface ResultsDisplayProps {
  result: CompatibilityResult
  baseFeatureId: string
  targetFeatureId: string
}

const getStatusBadge = (status: SupportLevel) => {
  switch (status) {
    case 'full':
      return (
        <Badge variant="success" className="text-base px-4 py-2">
          ✓ Compatible
        </Badge>
      )
    case 'partial':
      return (
        <Badge variant="warning" className="text-base px-4 py-2">
          ⚠ Partially Compatible
        </Badge>
      )
    case 'none':
      return (
        <Badge variant="destructive" className="text-base px-4 py-2">
          ✗ Not Compatible
        </Badge>
      )
  }
}

const getSupportIcon = (level: SupportLevel) => {
  switch (level) {
    case 'full':
      return <span className="text-green-500">✓</span>
    case 'partial':
      return <span className="text-yellow-500">⚠</span>
    case 'none':
      return <span className="text-red-500">✗</span>
  }
}

const groupBrowsersBySupport = (browsers: BrowserSupport[]) => {
  const grouped = browsers.reduce(
    (acc, browser) => {
      if (!acc[browser.browserId]) {
        acc[browser.browserId] = { full: [], partial: [], none: [] }
      }
      acc[browser.browserId][browser.supportLevel].push(browser.version)
      return acc
    },
    {} as Record<string, Record<SupportLevel, string[]>>,
  )

  return Object.entries(grouped).map(([browserId, versionsByLevel]) => {
    const totalVersions = versionsByLevel.full.length + versionsByLevel.partial.length + versionsByLevel.none.length
    const overallSupport: SupportLevel =
      versionsByLevel.full.length === totalVersions
        ? 'full'
        : versionsByLevel.full.length + versionsByLevel.partial.length > versionsByLevel.none.length
          ? 'partial'
          : 'none'

    // Sort versions numerically for better display
    const sortVersions = (versions: string[]) => versions.sort((a, b) => parseFloat(a) - parseFloat(b))

    return {
      browserId,
      versionsByLevel: {
        full: sortVersions([...versionsByLevel.full]),
        partial: sortVersions([...versionsByLevel.partial]),
        none: sortVersions([...versionsByLevel.none]),
      } as Record<SupportLevel, string[]>,
      overallSupport,
    }
  })
}

const formatVersionsList = (versions: string[]) => {
  if (versions.length === 0) return null

  // Group consecutive versions into ranges for better readability
  const groupedVersions = []
  let rangeStart = versions[0]
  let rangeEnd = versions[0]

  for (let i = 1; i < versions.length; i++) {
    const current = parseFloat(versions[i])
    const previous = parseFloat(versions[i - 1])

    if (current === previous + 1 || current === previous + 0.1) {
      rangeEnd = versions[i]
    } else {
      // Add the previous range
      if (rangeStart === rangeEnd) {
        groupedVersions.push(`v${rangeStart}`)
      } else {
        groupedVersions.push(`v${rangeStart}-v${rangeEnd}`)
      }
      rangeStart = versions[i]
      rangeEnd = versions[i]
    }
  }

  // Add the final range
  if (rangeStart === rangeEnd) {
    groupedVersions.push(`v${rangeStart}`)
  } else {
    groupedVersions.push(`v${rangeStart}-v${rangeEnd}`)
  }

  // Return all versions without truncation
  return groupedVersions.join(', ')
}

export function ResultsDisplay({ result, baseFeatureId, targetFeatureId }: ResultsDisplayProps) {
  const [baseFeature, setBaseFeature] = useState<any>(null)
  const [targetFeature, setTargetFeature] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFeatures = async () => {
      setLoading(true)
      setError(null)
      try {
        const [base, target] = await Promise.all([getFeature(baseFeatureId), getFeature(targetFeatureId)])
        setBaseFeature(base)
        setTargetFeature(target)
      } catch (error) {
        console.error('Error loading features:', error)
        setError('Failed to load feature details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadFeatures()
  }, [baseFeatureId, targetFeatureId])

  const baseFeatureTitle = baseFeature?.title || getFeatureTitle(baseFeatureId) || baseFeatureId
  const targetFeatureTitle = targetFeature?.title || getFeatureTitle(targetFeatureId) || targetFeatureId

  const processedSupport = groupBrowsersBySupport(result.details.overlappingSupport)
  const summaryText = generateSummaryText(result, baseFeatureTitle, targetFeatureTitle)

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">{getStatusBadge(result.compatible)}</div>
        <CardTitle className="text-xl">Compatibility Result</CardTitle>
        <CardDescription>{summaryText}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">{baseFeatureTitle}</h3>
              {loading ? (
                <div className="flex items-center mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  <span className="text-sm text-gray-500">Loading feature details...</span>
                </div>
              ) : (
                <>
                  {baseFeature?.description && (
                    <p className="text-sm text-muted-foreground mt-2">{baseFeature.description}</p>
                  )}
                  <CanIUseLearnMoreButton
                    featureTitle={baseFeatureTitle}
                    featureId={baseFeatureId}
                    className="mt-4 w-full"
                  />
                </>
              )}
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">{targetFeatureTitle}</h3>
              {loading ? (
                <div className="flex items-center mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  <span className="text-sm text-gray-500">Loading feature details...</span>
                </div>
              ) : (
                <>
                  {targetFeature?.description && (
                    <p className="text-sm text-muted-foreground mt-2">{targetFeature.description}</p>
                  )}
                  <CanIUseLearnMoreButton
                    featureTitle={targetFeatureTitle}
                    featureId={targetFeatureId}
                    className="mt-4 w-full"
                  />
                </>
              )}
            </div>
          </div>

          <div className="space-y-6 border-t pt-6">
            <h4 className="font-semibold mb-3">Browser Support Analysis</h4>

            <div className="space-y-4">
              <Accordion type="multiple">
                {processedSupport.map((browserData) => (
                  <AccordionItem key={browserData.browserId} value={browserData.browserId}>
                    <AccordionTrigger>
                      <span>
                        {getBrowserName(browserData.browserId)}
                        <span className="ml-1">{getSupportIcon(browserData.overallSupport)}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      {Object.entries(browserData.versionsByLevel).map(([level, versions]) => {
                        const supportLevel = level as SupportLevel
                        const formattedVersions = formatVersionsList(versions)
                        return (
                          formattedVersions && (
                            <div key={level} className="text-sm">
                              <div className="flex items-start">
                                <span className="mr-2 mt-0.5">{getSupportIcon(supportLevel)}</span>
                                <div>
                                  <span className="font-medium capitalize">{level} Support:</span>
                                  <div className="text-gray-600 mt-1">{formattedVersions}</div>
                                </div>
                              </div>
                            </div>
                          )
                        )
                      })}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
