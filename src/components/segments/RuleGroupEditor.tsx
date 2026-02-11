/**
 * Rule Group Editor
 * Recursive AND/OR rule group builder supporting nested groups (max 3 levels)
 */

import { useCallback } from 'react';
import { Button } from '../common/Button';
import { RuleCondition } from './RuleCondition';
import { SEGMENT_FIELDS } from '@/types/segment';
import type {
  SegmentCondition as ConditionType,
  SegmentRuleGroup,
  SegmentLogic,
} from '@/types/segment';

// =============================================================================
// Types
// =============================================================================

export interface RuleGroupEditorProps {
  group: SegmentRuleGroup;
  onChange: (updated: SegmentRuleGroup) => void;
  onRemove?: () => void;
  depth: number;
  maxDepth: number;
}

// =============================================================================
// Helpers
// =============================================================================

let groupCounter = 0;

function createCondition(): ConditionType {
  return {
    id: `cond-${Date.now()}-${++groupCounter}`,
    field: SEGMENT_FIELDS[0].key,
    operator: SEGMENT_FIELDS[0].operators[0],
    value: '',
  };
}

function createGroup(): SegmentRuleGroup {
  return {
    logic: 'AND' as SegmentLogic,
    conditions: [createCondition()],
  };
}

// Depth-based border colors for visual nesting
const DEPTH_COLORS = [
  'border-l-[#0353a4]',   // depth 0 — primary blue
  'border-l-[#006daa]',   // depth 1 — secondary blue
  'border-l-[#b45309]',   // depth 2 — warning orange
];

// =============================================================================
// Component
// =============================================================================

export function RuleGroupEditor({
  group,
  onChange,
  onRemove,
  depth,
  maxDepth,
}: RuleGroupEditorProps) {
  const canNest = depth < maxDepth - 1;

  // Logic toggle
  const handleLogicToggle = useCallback(
    (newLogic: SegmentLogic) => {
      onChange({ ...group, logic: newLogic });
    },
    [group, onChange],
  );

  // Condition handlers
  const handleAddCondition = useCallback(() => {
    onChange({
      ...group,
      conditions: [...group.conditions, createCondition()],
    });
  }, [group, onChange]);

  const handleUpdateCondition = useCallback(
    (id: string, updated: ConditionType) => {
      onChange({
        ...group,
        conditions: group.conditions.map((c) => (c.id === id ? updated : c)),
      });
    },
    [group, onChange],
  );

  const handleRemoveCondition = useCallback(
    (id: string) => {
      onChange({
        ...group,
        conditions: group.conditions.filter((c) => c.id !== id),
      });
    },
    [group, onChange],
  );

  // Nested group handlers
  const handleAddGroup = useCallback(() => {
    onChange({
      ...group,
      groups: [...(group.groups ?? []), createGroup()],
    });
  }, [group, onChange]);

  const handleUpdateGroup = useCallback(
    (index: number, updated: SegmentRuleGroup) => {
      const groups = [...(group.groups ?? [])];
      groups[index] = updated;
      onChange({ ...group, groups });
    },
    [group, onChange],
  );

  const handleRemoveGroup = useCallback(
    (index: number) => {
      const groups = (group.groups ?? []).filter((_, i) => i !== index);
      onChange({ ...group, groups: groups.length > 0 ? groups : undefined });
    },
    [group, onChange],
  );

  const borderColor = DEPTH_COLORS[depth] ?? DEPTH_COLORS[DEPTH_COLORS.length - 1];

  return (
    <div
      className={`space-y-2 ${
        depth > 0
          ? `border-l-4 ${borderColor} pl-4 py-2 bg-white rounded-r-lg`
          : ''
      }`}
    >
      {/* Group header with logic toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Match</span>
          <button
            type="button"
            onClick={() => handleLogicToggle('AND')}
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              group.logic === 'AND'
                ? 'bg-[#0353a4] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => handleLogicToggle('OR')}
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              group.logic === 'OR'
                ? 'bg-[#0353a4] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ANY
          </button>
        </div>

        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-gray-400 hover:text-[#d32f2f]"
            aria-label="Remove group"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        )}
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {group.conditions.map((condition, idx) => (
          <div key={condition.id}>
            {idx > 0 && (
              <div className="flex justify-center py-1">
                <span className="text-xs font-medium text-gray-400 uppercase">
                  {group.logic}
                </span>
              </div>
            )}
            <RuleCondition
              condition={condition}
              onChange={(updated) => handleUpdateCondition(condition.id, updated)}
              onRemove={() => handleRemoveCondition(condition.id)}
            />
          </div>
        ))}
      </div>

      {/* Nested groups */}
      {group.groups?.map((childGroup, idx) => (
        <div key={`group-${depth}-${idx}`}>
          <div className="flex justify-center py-1">
            <span className="text-xs font-medium text-gray-400 uppercase">
              {group.logic}
            </span>
          </div>
          <RuleGroupEditor
            group={childGroup}
            onChange={(updated) => handleUpdateGroup(idx, updated)}
            onRemove={() => handleRemoveGroup(idx)}
            depth={depth + 1}
            maxDepth={maxDepth}
          />
        </div>
      ))}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={handleAddCondition}>
          + Condition
        </Button>
        {canNest && (
          <Button type="button" variant="outline" size="sm" onClick={handleAddGroup}>
            + Group
          </Button>
        )}
      </div>
    </div>
  );
}
