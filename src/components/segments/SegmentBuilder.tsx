/**
 * Segment Builder
 * Visual AND/OR rule group builder with real-time size estimation
 */

import { useState, useCallback } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Badge } from '../common/Badge';
import { RuleGroupEditor } from './RuleGroupEditor';
import { SegmentPreviewModal } from './SegmentPreviewModal';
import { useCreateSegment, useUpdateSegment, useEstimateSegmentSize } from '@/services/segments';
import { SEGMENT_FIELDS } from '@/types/segment';
import type {
  SegmentCondition as ConditionType,
  SegmentRuleGroup,
  SegmentLogic,
  AudienceSegment,
} from '@/types/segment';

// =============================================================================
// Types
// =============================================================================

export interface SegmentBuilderProps {
  segment?: AudienceSegment;
  onSuccess?: (segment: AudienceSegment) => void;
  onCancel?: () => void;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

let conditionCounter = 0;

function createCondition(): ConditionType {
  return {
    id: `cond-${Date.now()}-${++conditionCounter}`,
    field: SEGMENT_FIELDS[0].key,
    operator: SEGMENT_FIELDS[0].operators[0],
    value: '',
  };
}

// =============================================================================
// Component
// =============================================================================

export function SegmentBuilder({
  segment,
  onSuccess,
  onCancel,
  className = '',
}: SegmentBuilderProps) {
  const isEdit = !!segment;

  const [name, setName] = useState(segment?.name ?? '');
  const [description, setDescription] = useState(segment?.description ?? '');
  const [logic, setLogic] = useState<SegmentLogic>(segment?.rules?.logic ?? 'AND');
  const [conditions, setConditions] = useState<ConditionType[]>(
    segment?.rules?.conditions?.length
      ? segment.rules.conditions
      : [createCondition()],
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const createMutation = useCreateSegment();
  const updateMutation = useUpdateSegment();

  // Build current rules for estimation
  const currentRules: SegmentRuleGroup | null =
    conditions.length > 0 && conditions.some((c) => c.value || ['is_empty', 'is_not_empty'].includes(c.operator))
      ? { logic, conditions }
      : null;

  const { data: estimatedSize, isLoading: estimating } = useEstimateSegmentSize(currentRules);

  // Root group change handler for RuleGroupEditor
  const handleRootGroupChange = useCallback((updatedGroup: SegmentRuleGroup) => {
    setLogic(updatedGroup.logic);
    setConditions(updatedGroup.conditions);
  }, []);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) {
      setSubmitError('Segment name is required');
      return;
    }

    if (conditions.length === 0) {
      setSubmitError('At least one condition is required');
      return;
    }

    const rules: SegmentRuleGroup = { logic, conditions };

    try {
      let result: AudienceSegment;
      if (isEdit && segment) {
        result = await updateMutation.mutateAsync({
          id: segment.id,
          input: { name, description: description || null, rules },
        });
      } else {
        result = await createMutation.mutateAsync({
          name,
          description: description || null,
          rules,
        });
      }
      onSuccess?.(result);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save segment');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className={className} padding="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-[#003559]">
            {isEdit ? 'Edit Segment' : 'Create Segment'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Define rules to create a reusable audience segment
          </p>
        </div>

        {/* Error */}
        {submitError && (
          <div className="p-4 bg-[#d32f2f]/10 border border-[#d32f2f]/20 rounded-lg text-[#d32f2f] text-sm" role="alert">
            {submitError}
          </div>
        )}

        {/* Name & Description */}
        <div className="space-y-4">
          <div>
            <label htmlFor="segment-name" className="block text-sm font-medium text-gray-700 mb-1">
              Segment Name *
            </label>
            <Input
              id="segment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High-Value Active Members"
            />
          </div>
          <div>
            <label htmlFor="segment-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              id="segment-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>
        </div>

        {/* Rules */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 border-b border-[#e0e0e0] pb-2">
            Conditions
          </h3>

          <RuleGroupEditor
            group={{ logic, conditions }}
            onChange={handleRootGroupChange}
            depth={0}
            maxDepth={3}
          />
        </div>

        {/* Estimated Size + Preview */}
        <div className="flex items-center justify-between p-4 bg-[#f5f5f5] rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Estimated audience:</span>
            {estimating ? (
              <span className="text-sm text-gray-400">Calculating...</span>
            ) : estimatedSize !== undefined ? (
              <Badge variant="info">{estimatedSize.toLocaleString()} members</Badge>
            ) : (
              <span className="text-sm text-gray-400">Add conditions to see estimate</span>
            )}
          </div>
          {currentRules && estimatedSize !== undefined && estimatedSize > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              Preview Members
            </Button>
          )}
        </div>

        {/* Preview Modal */}
        <SegmentPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          rules={currentRules}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#e0e0e0]">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isPending}>
            {isEdit ? 'Save Segment' : 'Create Segment'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default SegmentBuilder;
