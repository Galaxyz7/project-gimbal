/**
 * OAuth Connector
 * Step 2c: Placeholder for GA4/Meta/Sheets OAuth flows
 */

import { Button } from '../common/Button';

// =============================================================================
// Types
// =============================================================================

export interface OAuthConnectorProps {
  sourceType: 'google_analytics' | 'meta_pixel' | 'google_sheets';
  name: string;
  onNameChange: (name: string) => void;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const PROVIDER_INFO: Record<string, { label: string; description: string }> = {
  google_analytics: {
    label: 'Google Analytics 4',
    description: 'Connect your GA4 property to import analytics data.',
  },
  meta_pixel: {
    label: 'Meta Pixel',
    description: 'Connect your Meta Pixel to import conversion data.',
  },
  google_sheets: {
    label: 'Google Sheets',
    description: 'Connect a Google Sheet to import spreadsheet data.',
  },
};

// =============================================================================
// Component
// =============================================================================

export function OAuthConnector({ sourceType, className = '' }: OAuthConnectorProps) {
  const info = PROVIDER_INFO[sourceType] ?? { label: sourceType, description: '' };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-lg border-2 border-dashed border-[#e0e0e0] p-8 text-center">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <h3 className="text-lg font-medium text-[#003559] mb-1">{info.label}</h3>
        <p className="text-sm text-gray-500 mb-4">{info.description}</p>
        <Button variant="primary" disabled>
          Connect with OAuth (Coming Soon)
        </Button>
        <p className="text-xs text-gray-400 mt-3">
          OAuth integration will be available in a future update.
        </p>
      </div>
    </div>
  );
}
