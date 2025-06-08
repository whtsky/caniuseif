import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import {
  CompatibilityResult,
  BrowserSupport,
  getBrowserName,
  SupportLevel,
  getFeatureTitle,
} from '@/services/caniuseService'
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
    return `${Math.round(fullSupportPercentage + partialSupportPercentage)}% of browsers supporting "${baseFeatureTitle}" have at least partial support for "${targetFeatureTitle}".`
  } else {
    return `Only ${Math.round(fullSupportPercentage + partialSupportPercentage)}% of browsers supporting "${baseFeatureTitle}" support "${targetFeatureTitle}". Consider alternative approaches.`
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
  const baseFeatureTitle = getFeatureTitle(baseFeatureId)
  const targetFeatureTitle = getFeatureTitle(targetFeatureId)

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
          <div className="flex flex-col sm:flex-row gap-2">
            <CanIUseLearnMoreButton featureTitle={baseFeatureTitle} featureId={baseFeatureId} className="flex-1" />
            <CanIUseLearnMoreButton featureTitle={targetFeatureTitle} featureId={targetFeatureId} className="flex-1" />
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
