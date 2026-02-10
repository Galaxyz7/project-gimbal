/**
 * Template Library
 * Card grid showing available starter and user templates with preview and actions
 * - Search input with debounce (Item 2)
 * - Tag badges on cards (Item 2)
 * - Email preview modal (Item 3)
 * - Template performance stats (Item 7)
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Skeleton } from '../Skeleton';
import { EmptyState } from '../common/EmptyState';
import { EmailPreviewModal } from './EmailPreviewModal';
import { useTemplates, useDuplicateTemplate, useAllTemplateStats } from '@/services/campaigns';
import type { CampaignTemplate, CampaignType, TemplateStats } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface TemplateLibraryProps {
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

// =============================================================================
// Hooks
// =============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// Sub-components
// =============================================================================

interface TemplateCardProps {
  template: CampaignTemplate;
  stats?: TemplateStats;
  onUse: (template: CampaignTemplate) => void;
  onCustomize: (template: CampaignTemplate) => void;
  onPreview?: (template: CampaignTemplate) => void;
  isCustomizing?: boolean;
}

function TemplateCard({ template, stats, onUse, onCustomize, onPreview, isCustomizing }: TemplateCardProps) {
  const previewText = template.content.length > 120
    ? template.content.slice(0, 120) + '...'
    : template.content;

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-[#003559] truncate">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
              {template.description}
            </p>
          )}
        </div>
        <Badge
          variant={template.templateType === 'sms' ? 'info' : 'default'}
          className="ml-2 flex-shrink-0"
        >
          {template.templateType === 'sms' ? 'SMS' : 'Email'}
        </Badge>
      </div>

      {template.subject && (
        <p className="text-sm text-[#003559] font-medium mb-2 truncate">
          Subject: {template.subject}
        </p>
      )}

      <div className="flex-1 mb-3">
        <p className="text-sm text-gray-600 whitespace-pre-line">
          {previewText}
        </p>
      </div>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-[#b9d6f2]/30 text-[#003559] rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats (Item 7) */}
      {stats && stats.timesUsed > 0 && (
        <p className="text-xs text-gray-400 mb-3">
          Used {stats.timesUsed} time{stats.timesUsed !== 1 ? 's' : ''}
          {stats.avgOpenRate > 0 && ` | Avg open: ${stats.avgOpenRate.toFixed(1)}%`}
          {stats.lastUsedAt && ` | Last: ${new Date(stats.lastUsedAt).toLocaleDateString()}`}
        </p>
      )}

      <div className="flex gap-2 mt-auto">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onUse(template)}
          className="flex-1"
        >
          Use Template
        </Button>
        {template.templateType === 'email' && onPreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(template)}
          >
            Preview
          </Button>
        )}
        {template.isSystem && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onCustomize(template)}
            disabled={isCustomizing}
          >
            Customize
          </Button>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Component
// =============================================================================

export function TemplateLibrary({ className = '' }: TemplateLibraryProps) {
  const [typeFilter, setTypeFilter] = useState<CampaignType | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<CampaignTemplate | null>(null);
  const navigate = useNavigate();

  const debouncedSearch = useDebounce(searchInput, 300);

  const queryParams = useMemo(() => {
    const params: { type?: CampaignType; search?: string } = {};
    if (typeFilter) params.type = typeFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [typeFilter, debouncedSearch]);

  const { data: templates, isLoading } = useTemplates(queryParams);
  const { data: allStats } = useAllTemplateStats();
  const duplicateMutation = useDuplicateTemplate();

  const statsMap = useMemo(() => {
    if (!allStats) return new Map<string, TemplateStats>();
    return new Map(allStats.map((s) => [s.templateId, s]));
  }, [allStats]);

  const { starterTemplates, userTemplates } = useMemo(() => {
    if (!templates) return { starterTemplates: [], userTemplates: [] };

    return {
      starterTemplates: templates.filter((t) => t.isSystem),
      userTemplates: templates.filter((t) => !t.isSystem),
    };
  }, [templates]);

  const handleUseTemplate = useCallback((template: CampaignTemplate) => {
    navigate(`/campaigns/new?templateId=${template.id}`);
  }, [navigate]);

  const handleCustomize = useCallback((template: CampaignTemplate) => {
    duplicateMutation.mutate(
      { templateId: template.id },
      {
        onSuccess: (newTemplate) => {
          navigate(`/campaigns/new?templateId=${newTemplate.id}`);
        },
      }
    );
  }, [duplicateMutation, navigate]);

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  const hasTemplates = starterTemplates.length > 0 || userTemplates.length > 0;

  return (
    <div className={className}>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search templates..."
            aria-label="Search templates"
          />
        </div>
        <div className="w-36">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CampaignType | '')}
            options={TYPE_FILTER_OPTIONS}
            hideLabel
          />
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/campaigns/new')}
        >
          Create from Scratch
        </Button>
      </div>

      {!hasTemplates ? (
        <EmptyState
          title={debouncedSearch ? 'No templates match your search' : 'No templates yet'}
          description={debouncedSearch
            ? 'Try a different search term or clear your filters.'
            : 'Create your first campaign template or check back later for starter templates.'}
        />
      ) : (
        <>
          {/* Starter Templates */}
          {starterTemplates.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-[#003559] mb-4">
                Starter Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {starterTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    stats={statsMap.get(template.id)}
                    onUse={handleUseTemplate}
                    onCustomize={handleCustomize}
                    onPreview={setPreviewTemplate}
                    isCustomizing={duplicateMutation.isPending}
                  />
                ))}
              </div>
            </section>
          )}

          {/* User Templates */}
          {userTemplates.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-[#003559] mb-4">
                My Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    stats={statsMap.get(template.id)}
                    onUse={handleUseTemplate}
                    onCustomize={handleCustomize}
                    onPreview={setPreviewTemplate}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Email Preview Modal (Item 3) */}
      <EmailPreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    </div>
  );
}

export default TemplateLibrary;
