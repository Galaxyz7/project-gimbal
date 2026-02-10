/**
 * Rule Condition
 * Single condition row: field / operator / value with remove button
 */

import { Select } from '../common/Select';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import {
  SEGMENT_FIELDS,
  OPERATOR_LABELS,
  MEMBERSHIP_STATUS_OPTIONS,
} from '@/types/segment';
import type { SegmentCondition, SegmentOperator } from '@/types/segment';

// =============================================================================
// Types
// =============================================================================

export interface RuleConditionProps {
  condition: SegmentCondition;
  onChange: (updated: SegmentCondition) => void;
  onRemove: () => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function RuleCondition({ condition, onChange, onRemove, className = '' }: RuleConditionProps) {
  const fieldDef = SEGMENT_FIELDS.find((f) => f.key === condition.field);
  const operators = fieldDef?.operators ?? [];

  const fieldOptions = SEGMENT_FIELDS.map((f) => ({ value: f.key, label: f.label }));
  const operatorOptions = operators.map((op) => ({
    value: op,
    label: OPERATOR_LABELS[op],
  }));

  const handleFieldChange = (newField: string) => {
    const newFieldDef = SEGMENT_FIELDS.find((f) => f.key === newField);
    const newOps = newFieldDef?.operators ?? [];
    onChange({
      ...condition,
      field: newField,
      operator: newOps[0] ?? 'equals',
      value: '',
    });
  };

  const handleOperatorChange = (newOp: string) => {
    onChange({ ...condition, operator: newOp as SegmentOperator });
  };

  const handleValueChange = (newValue: string) => {
    onChange({ ...condition, value: newValue });
  };

  // Determine value input type
  const showValueInput = !['is_empty', 'is_not_empty'].includes(condition.operator);
  const isStatusField = condition.field === 'membershipStatus';
  const isNumberField = fieldDef?.type === 'number' || condition.operator === 'in_last_days';
  const isDateField = fieldDef?.type === 'date' && !['in_last_days'].includes(condition.operator);

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      {/* Field */}
      <div className="w-44 flex-shrink-0">
        <Select
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          options={fieldOptions}
          hideLabel
        />
      </div>

      {/* Operator */}
      <div className="w-40 flex-shrink-0">
        <Select
          value={condition.operator}
          onChange={(e) => handleOperatorChange(e.target.value)}
          options={operatorOptions}
          hideLabel
        />
      </div>

      {/* Value */}
      {showValueInput && (
        <div className="flex-1 min-w-0">
          {isStatusField ? (
            <Select
              value={condition.value}
              onChange={(e) => handleValueChange(e.target.value)}
              options={MEMBERSHIP_STATUS_OPTIONS}
              hideLabel
            />
          ) : isDateField ? (
            <Input
              type="date"
              value={condition.value}
              onChange={(e) => handleValueChange(e.target.value)}
            />
          ) : isNumberField ? (
            <Input
              type="number"
              value={condition.value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter value"
            />
          ) : (
            <Input
              value={condition.value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter value"
            />
          )}
        </div>
      )}

      {/* Remove */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-gray-400 hover:text-[#d32f2f] flex-shrink-0"
        aria-label="Remove condition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>
    </div>
  );
}
