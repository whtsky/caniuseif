import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CompatibilityResult, BrowserSupport, getBrowserName } from '../services/caniuseService'
import { CanIUseLearnMoreButton } from './caniuse-learn-more-button'

interface ResultsDisplayProps {
  result: CompatibilityResult
  baseFeatureTitle: string
  baseFeatureId: string
  targetFeatureTitle: string
  targetFeatureId: string
}

const getStatusBadge = (status: 'yes' | 'partial' | 'no') => {
  switch (status) {
    case 'yes':
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
    case 'no':
      return (
        <Badge variant="destructive" className="text-base px-4 py-2">
          ✗ Not Compatible
        </Badge>
      )
  }
}

const getSupportIcon = (level: 'full' | 'partial' | 'none') => {
  switch (level) {
    case 'full':
      return <span className="text-green-500">✓</span>
    case 'partial':
      return <span className="text-yellow-500">⚠</span>
    case 'none':
      return <span className="text-red-500">✗</span>
  }
}

const groupBrowsersById = (browsers: BrowserSupport[]) => {
  const grouped = browsers.reduce(
    (acc, browser) => {
      acc[browser.browserId] ??= []
      acc[browser.browserId].push(browser)
      return acc
    },
    {} as Record<string, BrowserSupport[]>,
  )

  // Sort versions within each browser
  Object.keys(grouped).forEach((browserId) => {
    grouped[browserId].sort((a, b) => {
      // Simple version comparison - may need improvement for complex version strings
      const aNum = parseFloat(a.version)
      const bNum = parseFloat(b.version)
      return aNum - bNum
    })
  })

  return grouped
}


export function ResultsDisplay({ result, baseFeatureTitle, baseFeatureId, targetFeatureTitle, targetFeatureId }: ResultsDisplayProps) {

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">{getStatusBadge(result.compatible)}</div>
        <CardTitle className="text-xl">Compatibility Result</CardTitle>
        <CardDescription>{result.summary}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Browser Support Overlap</span>
            <span className="font-medium">{Math.round(result.confidence)}%</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <CanIUseLearnMoreButton featureTitle={baseFeatureTitle} featureId={baseFeatureId} className="flex-1" />
            <CanIUseLearnMoreButton featureTitle={targetFeatureTitle} featureId={targetFeatureId} className="flex-1" />
          </div>

          <div className="space-y-6 border-t pt-6">
            <div>
              <h4 className="font-semibold mb-3">Browser Support Analysis</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This shows how well "{targetFeatureTitle}" works in browsers that support "{baseFeatureTitle}".
              </p>

              <div className="space-y-4">
                {Object.entries(groupBrowsersById(result.details.overlappingSupport)).map(
                  ([browserId, versions]) => (
                    <div key={browserId} className="border rounded-lg p-4">
                      <h5 className="font-medium mb-2">{getBrowserName(browserId)}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {versions.slice(0, 6).map((version, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>v{version.version}</span>
                            <div className="flex items-center">
                              {getSupportIcon(version.supportLevel)}
                              <span className="ml-1 text-xs text-muted-foreground">{version.supportLevel}</span>
                            </div>
                          </div>
                        ))}
                        {versions.length > 6 && (
                          <div className="text-xs text-muted-foreground">+{versions.length - 6} more versions</div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
