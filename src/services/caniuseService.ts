import { features, agents, feature, Feature } from 'caniuse-lite';

// Type definitions
export interface BrowserSupport {
  browserId: string;
  version: string;
  support: string;
  supportLevel: 'full' | 'partial' | 'none';
}

export interface CompatibilityResult {
  compatible: 'yes' | 'partial' | 'no';
  confidence: number;
  summary: string;
  details: {
    baseFeatureBrowsers: BrowserSupport[];
    targetFeatureSupport: BrowserSupport[];
    overlappingSupport: BrowserSupport[];
  };
}

// Get list of all available features
export function getFeaturesList(): { id: string; title: string }[] {
  return Object.entries(features).map(([id, packedData]) => {
    const Feature = feature(packedData);
    return {
      id,
      title: Feature.title || id
    };
  });
}

export function getFeature(featureId: string): Feature | undefined {
  const packedFeature = features[featureId];
  if (!packedFeature) return undefined;
  return feature(packedFeature);
}

export function searchFeatures(query: string): { id: string; title: string }[] {
  if (!query) return getFeaturesList();
  
  const lowerQuery = query.toLowerCase();
  return getFeaturesList()
    .filter(item => {
      const title = item.title || item.id;
      return title.toLowerCase().includes(lowerQuery) ||
             item.id.toLowerCase().includes(lowerQuery);
    });
}

function parseSupportLevel(supportString: string): 'full' | 'partial' | 'none' {
  if (!supportString || supportString === 'n') return 'none';
  if (supportString === 'y') return 'full';
  if (supportString.includes('a') || supportString.includes('x')) return 'partial';
  return 'none';
}

// Get browser support data with enhanced browser information
function getBrowserSupportData(Feature: Feature): BrowserSupport[] {
  const supportData: BrowserSupport[] = [];
  
  Object.entries(Feature.stats).forEach(([browserId, versions]) => {
    
    Object.entries(versions).forEach(([version, support]) => {
      supportData.push({
        browserId,
        version,
        support,
        supportLevel: parseSupportLevel(support)
      });
    });
  });

  return supportData;
}

/** Check compatibility between two features  */
export function checkCompatibility(baseFeatureId: string, targetFeatureId: string): CompatibilityResult | null {
  const baseFeature = getFeature(baseFeatureId);
  const targetFeature = getFeature(targetFeatureId);

  if (!baseFeature || !targetFeature) {
    return null;
  }

  const baseBrowserSupport = getBrowserSupportData(baseFeature);
  const targetBrowserSupport = getBrowserSupportData(targetFeature);

  // Find browsers that support the base feature
  const supportingBrowsers = baseBrowserSupport.filter(
    support => support.supportLevel === 'full' || support.supportLevel === 'partial'
  );

  // Check target feature support for these browsers
  const overlappingSupport: BrowserSupport[] = [];
  let fullSupportCount = 0;
  let partialSupportCount = 0;
  let noSupportCount = 0;

  supportingBrowsers.forEach(baseSupport => {
    const targetSupport = targetBrowserSupport.find(
      ts => ts.browserId === baseSupport.browserId && ts.version === baseSupport.version
    );

    if (targetSupport) {
      overlappingSupport.push(targetSupport);
      
      switch (targetSupport.supportLevel) {
        case 'full':
          fullSupportCount++;
          break;
        case 'partial':
          partialSupportCount++;
          break;
        case 'none':
          noSupportCount++;
          break;
      }
    } else {
      // No data means no support
      noSupportCount++;
      overlappingSupport.push({
        browserId: baseSupport.browserId,
        version: baseSupport.version,
        support: 'n',
        supportLevel: 'none'
      });
    }
  });

  const totalCount = supportingBrowsers.length;
  const fullSupportPercentage = totalCount > 0 ? (fullSupportCount / totalCount) * 100 : 0;
  const partialSupportPercentage = totalCount > 0 ? (partialSupportCount / totalCount) * 100 : 0;

  // Determine compatibility
  let compatible: 'yes' | 'partial' | 'no';
  let confidence: number;
  let summary: string;

  if (fullSupportPercentage >= 90) {
    compatible = 'yes';
    confidence = fullSupportPercentage;
    summary = `${Math.round(fullSupportPercentage)}% of browsers supporting "${baseFeature.title}" also fully support "${targetFeature.title}".`;
  } else if (fullSupportPercentage + partialSupportPercentage >= 70) {
    compatible = 'partial';
    confidence = fullSupportPercentage + partialSupportPercentage;
    summary = `${Math.round(fullSupportPercentage + partialSupportPercentage)}% of browsers supporting "${baseFeature.title}" have at least partial support for "${targetFeature.title}".`;
  } else {
    compatible = 'no';
    confidence = 100 - (fullSupportPercentage + partialSupportPercentage);
    summary = `Only ${Math.round(fullSupportPercentage + partialSupportPercentage)}% of browsers supporting "${baseFeature.title}" support "${targetFeature.title}". Consider alternative approaches.`;
  }

  return {
    compatible,
    confidence,
    summary,
    details: {
      baseFeatureBrowsers: supportingBrowsers,
      targetFeatureSupport: targetBrowserSupport,
      overlappingSupport
    }
  };
}

/** Get browser name by id */
export function getBrowserName(browserId: string): string {
  const browser = agents[browserId];
  return browser?.browser || browserId;
}