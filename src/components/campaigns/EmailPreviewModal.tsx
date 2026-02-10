/**
 * Email Preview Modal
 * Renders email template HTML in a sandboxed iframe with desktop/mobile width toggles
 */

import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { CampaignTemplate } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface EmailPreviewModalProps {
  template: CampaignTemplate | null;
  onClose: () => void;
}

type PreviewWidth = 'desktop' | 'mobile';

const WIDTH_MAP: Record<PreviewWidth, number> = {
  desktop: 600,
  mobile: 375,
};

// =============================================================================
// Component
// =============================================================================

export function EmailPreviewModal({ template, onClose }: EmailPreviewModalProps) {
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>('desktop');

  if (!template) return null;

  return (
    <Modal
      isOpen={!!template}
      onClose={onClose}
      title={`Preview: ${template.name}`}
      size="full"
    >
      {/* Subject / Preheader */}
      <div className="mb-4 space-y-1">
        {template.subject && (
          <p className="text-sm">
            <span className="font-medium text-gray-600">Subject:</span>{' '}
            <span className="text-[#003559]">{template.subject}</span>
          </p>
        )}
        {template.preheader && (
          <p className="text-sm">
            <span className="font-medium text-gray-600">Preheader:</span>{' '}
            <span className="text-gray-500">{template.preheader}</span>
          </p>
        )}
      </div>

      {/* Width Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Preview:</span>
        <Button
          type="button"
          size="sm"
          variant={previewWidth === 'desktop' ? 'primary' : 'outline'}
          onClick={() => setPreviewWidth('desktop')}
        >
          Desktop (600px)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={previewWidth === 'mobile' ? 'primary' : 'outline'}
          onClick={() => setPreviewWidth('mobile')}
        >
          Mobile (375px)
        </Button>
      </div>

      {/* Email Preview */}
      <div className="flex justify-center bg-gray-50 rounded-lg p-4 min-h-[400px]">
        <iframe
          srcDoc={template.content}
          sandbox=""
          title="Email preview"
          style={{
            width: WIDTH_MAP[previewWidth],
            minHeight: 400,
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            backgroundColor: '#fff',
          }}
        />
      </div>
    </Modal>
  );
}
