/**
 * Template Selector
 * Dropdown to select a campaign template, grouped by "Starter Templates" and "My Templates"
 */

import { useMemo } from 'react';
import { useTemplates } from '@/services/campaigns';
import type { CampaignType, CampaignTemplate } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface TemplateSelectorProps {
  value: string | null;
  onChange: (templateId: string | null, template?: CampaignTemplate) => void;
  type?: CampaignType;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function TemplateSelector({
  value,
  onChange,
  type,
  placeholder = 'Select a template...',
  disabled = false,
  error,
  className = '',
}: TemplateSelectorProps) {
  const { data: templates, isLoading } = useTemplates(type ? { type } : undefined);

  const { starterTemplates, userTemplates } = useMemo(() => {
    if (!templates) return { starterTemplates: [], userTemplates: [] };

    return {
      starterTemplates: templates.filter((t) => t.isSystem),
      userTemplates: templates.filter((t) => !t.isSystem),
    };
  }, [templates]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value || null;
    const selectedTemplate = templates?.find((t) => t.id === selectedId);
    onChange(selectedId, selectedTemplate);
  };

  const isDisabled = disabled || isLoading;
  const hasError = !!error;

  return (
    <div className="w-full">
      <div className="relative">
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={isDisabled}
          aria-invalid={hasError}
          className={[
            'block w-full rounded-lg border bg-white appearance-none cursor-pointer',
            'text-[#003559] px-4 py-2 text-base min-h-[40px] pr-10',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            hasError
              ? 'border-[#d32f2f] focus:border-[#d32f2f] focus:ring-[#d32f2f]/20'
              : 'border-[#e0e0e0] hover:border-[#0353a4] focus:border-[#0353a4] focus:ring-[#0353a4]/20',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <option value="">{placeholder}</option>

          {starterTemplates.length > 0 && (
            <optgroup label="Starter Templates">
              {starterTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}

          {userTemplates.length > 0 && (
            <optgroup label="My Templates">
              {userTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Chevron icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {error && (
        <p role="alert" aria-live="assertive" className="mt-1.5 text-sm text-[#d32f2f]">
          {error}
        </p>
      )}
    </div>
  );
}

export default TemplateSelector;
