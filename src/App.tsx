import { useState, useEffect } from 'react'
import { FeatureSelector } from '@/components/feature-selector'
import { ResultsDisplay } from '@/components/results-display'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { checkCompatibility, CompatibilityResult, getFeature } from './services/caniuseService'

// Helper functions for URL management
function getFeatureIdFromUrl(paramName: string): string | null {
  const urlParams = new URLSearchParams(window.location.search)
  const featureId = urlParams.get(paramName)

  if (!featureId) return null

  const feature = getFeature(featureId)
  if (!feature) return null

  return featureId
}

function updateUrl(baseFeatureId: string | null, targetFeatureId: string | null) {
  const url = new URL(window.location.href)

  if (baseFeatureId) {
    url.searchParams.set('base', baseFeatureId)
  } else {
    url.searchParams.delete('base')
  }

  if (targetFeatureId) {
    url.searchParams.set('target', targetFeatureId)
  } else {
    url.searchParams.delete('target')
  }

  window.history.pushState({}, '', url.toString())
}

function App() {
  const [baseFeatureId, setBaseFeatureId] = useState<string | null>(null)
  const [targetFeatureId, setTargetFeatureId] = useState<string | null>(null)
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const performCompatibilityCheck = () => {
    if (!baseFeatureId || !targetFeatureId) {
      return
    }

    if (baseFeatureId === targetFeatureId) {
      setError('Choose two different features to compare')
      setCompatibilityResult(null)
      return
    }

    setError(null)

    try {
      const result = checkCompatibility(baseFeatureId, targetFeatureId)

      if (result) {
        setCompatibilityResult(result)
      } else {
        setError('Unable to analyze compatibility. Please try different features.')
        setCompatibilityResult(null)
      }
    } catch (err) {
      setError('An error occurred while checking compatibility.')
      setCompatibilityResult(null)
      console.error(err)
    }
  }

  // Initialize features from URL on component mount and handle browser navigation
  useEffect(() => {
    const initializeFromUrl = () => {
      const urlBaseFeatureId = getFeatureIdFromUrl('base')
      const urlTargetFeatureId = getFeatureIdFromUrl('target')

      setBaseFeatureId(urlBaseFeatureId)
      setTargetFeatureId(urlTargetFeatureId)
    }

    // Initialize on mount
    initializeFromUrl()

    // Listen for browser back/forward navigation
    const handlePopState = () => {
      initializeFromUrl()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Update URL when features change
  useEffect(() => {
    updateUrl(baseFeatureId, targetFeatureId)
  }, [baseFeatureId, targetFeatureId])

  // Auto-check compatibility when both features are selected
  useEffect(() => {
    performCompatibilityCheck()
  }, [baseFeatureId, targetFeatureId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Can<span className="text-blue-600">I</span>Use<span className="text-blue-600">If</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find out if a new web feature will work in browsers that support your existing features. Perfect for
            planning progressive enhancement strategies.
          </p>
        </div>

        {/* Main Interface */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Feature Compatibility Checker</CardTitle>
            <CardDescription className="text-center">
              Select the features you want to compare and see if they're compatible
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Feature Selectors */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <FeatureSelector
                  label="Currently Using:"
                  placeholder="Select the feature you already rely on..."
                  value={baseFeatureId}
                  onValueChange={setBaseFeatureId}
                />
                <p className="text-xs text-gray-600">Select the web feature that your project already depends on</p>
              </div>

              <div className="space-y-2">
                <FeatureSelector
                  label="Want to Use:"
                  placeholder="Select the new feature you're considering..."
                  value={targetFeatureId}
                  onValueChange={setTargetFeatureId}
                />
                <p className="text-xs text-gray-600">Select the new web feature you're thinking about adopting</p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {compatibilityResult && baseFeatureId && targetFeatureId && (
          <ResultsDisplay
            result={compatibilityResult}
            baseFeatureId={baseFeatureId}
            targetFeatureId={targetFeatureId}
          />
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 space-y-2">
          <p>
            Data powered by{' '}
            <a
              href="https://github.com/browserslist/caniuse-lite"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              caniuse-lite
            </a>
          </p>
          <p>
            Made by{' '}
            <a
              href="https://github.com/whtsky"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Wu Haotian
            </a>
            {' • '}
            <a
              href="https://github.com/whtsky/caniuseif"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Source Code on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
