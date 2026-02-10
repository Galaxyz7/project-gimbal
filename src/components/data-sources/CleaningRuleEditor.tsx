/**
 * Cleaning Rule Editor
 * Step 5: Configure per-column cleaning rules
 */

import { useState, useCallback } from 'react';
import type { ColumnConfig, CleaningRule } from '@/types/dataImport';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface CleaningRuleEditorProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const RULE_TYPE_OPTIONS = [
  { value: 'trim', label: 'Trim whitespace' },
  { value: 'collapse_whitespace', label: 'Collapse whitespace' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'title_case', label: 'Title Case' },
  { value: 'null_to_default', label: 'Default for nulls' },
  { value: 'empty_to_null', label: 'Empty to null' },
  { value: 'skip_if_empty', label: 'Skip row if empty' },
  { value: 'parse_number', label: 'Parse as number' },
  { value: 'parse_boolean', label: 'Parse as boolean' },
  { value: 'parse_date', label: 'Parse as date' },
  { value: 'validate_email', label: 'Validate email' },
  { value: 'validate_phone', label: 'Validate phone' },
  { value: 'validate_url', label: 'Validate URL' },
  { value: 'find_replace', label: 'Find & Replace' },
];

const RULE_DESCRIPTIONS: Record<string, string> = {
  trim: 'Remove leading and trailing whitespace',
  collapse_whitespace: 'Replace multiple spaces with a single space',
  lowercase: 'Convert text to lowercase',
  uppercase: 'Convert text to UPPERCASE',
  title_case: 'Convert text to Title Case',
  null_to_default: 'Replace null/empty values with a default',
  empty_to_null: 'Convert empty strings to null',
  skip_if_empty: 'Skip the entire row if this column is empty',
  parse_number: 'Parse text as a number (removes currency symbols)',
  parse_boolean: 'Parse text as true/false',
  parse_date: 'Parse text as a date',
  validate_email: 'Validate email format',
  validate_phone: 'Validate phone number format',
  validate_url: 'Validate URL format',
  find_replace: 'Find and replace text',
};

// =============================================================================
// Helpers
// =============================================================================

function createDefaultRule(type: string): CleaningRule {
  switch (type) {
    case 'null_to_default':
      return { type: 'null_to_default', default_value: '' };
    case 'parse_number':
      return { type: 'parse_number' };
    case 'parse_boolean':
      return { type: 'parse_boolean', true_values: ['yes', 'y', '1', 'true'], false_values: ['no', 'n', '0', 'false'] };
    case 'parse_date':
      return { type: 'parse_date', format: 'YYYY-MM-DD' };
    case 'validate_email':
      return { type: 'validate_email', on_invalid: 'skip' };
    case 'validate_phone':
      return { type: 'validate_phone', format: 'e164', on_invalid: 'skip' };
    case 'validate_url':
      return { type: 'validate_url', on_invalid: 'skip' };
    case 'find_replace':
      return { type: 'find_replace', find: '', replace: '' };
    case 'parse_percentage':
      return { type: 'parse_percentage', as_decimal: true };
    default:
      return { type } as CleaningRule;
  }
}

function getRuleLabel(rule: CleaningRule): string {
  const base = RULE_DESCRIPTIONS[rule.type] ?? rule.type;
  if (rule.type === 'null_to_default') return `Default: "${rule.default_value}"`;
  if (rule.type === 'find_replace') return `Replace "${rule.find}" → "${rule.replace}"`;
  if (rule.type === 'parse_date') return `Parse date (${rule.format})`;
  return base;
}

// =============================================================================
// Sub-components
// =============================================================================

interface ColumnRulesProps {
  column: ColumnConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updated: ColumnConfig) => void;
}

function ColumnRules({ column, isExpanded, onToggle, onUpdate }: ColumnRulesProps) {
  const [newRuleType, setNewRuleType] = useState('trim');

  const addRule = useCallback(() => {
    const rule = createDefaultRule(newRuleType);
    onUpdate({
      ...column,
      cleaning_rules: [...column.cleaning_rules, rule],
    });
  }, [column, newRuleType, onUpdate]);

  const removeRule = useCallback(
    (index: number) => {
      const rules = [...column.cleaning_rules];
      rules.splice(index, 1);
      onUpdate({ ...column, cleaning_rules: rules });
    },
    [column, onUpdate]
  );

  if (!column.included) return null;

  return (
    <div className="border border-[#e0e0e0] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-[#f5f5f5] transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-[#003559]">{column.source_name}</span>
          <Badge variant="default" size="sm">{column.type}</Badge>
        </div>
        <Badge variant={column.cleaning_rules.length > 0 ? 'primary' : 'default'} size="sm">
          {column.cleaning_rules.length} rules
        </Badge>
      </button>

      {isExpanded && (
        <div className="border-t border-[#e0e0e0] p-3 space-y-3 bg-[#f5f5f5]/50">
          {/* Existing rules */}
          {column.cleaning_rules.length > 0 ? (
            <ul className="space-y-2">
              {column.cleaning_rules.map((rule, index) => (
                <li key={index} className="flex items-center justify-between p-2 bg-white rounded border border-[#e0e0e0]">
                  <span className="text-sm text-[#003559]">{getRuleLabel(rule)}</span>
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="text-[#d32f2f] hover:text-red-700 text-sm p-1"
                    aria-label={`Remove rule: ${getRuleLabel(rule)}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No cleaning rules configured.</p>
          )}

          {/* Add new rule */}
          <div className="flex items-center gap-2">
            <Select
              value={newRuleType}
              onChange={(e) => setNewRuleType(e.target.value)}
              options={RULE_TYPE_OPTIONS}
              className="flex-1 !py-1 !text-sm"
              aria-label={`New rule type for ${column.source_name}`}
            />
            <Button variant="outline" size="sm" onClick={addRule}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function CleaningRuleEditor({ columns, onChange, className = '' }: CleaningRuleEditorProps) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  const includedColumns = columns.filter((c) => c.included);

  const updateColumn = useCallback(
    (sourceName: string, updated: ColumnConfig) => {
      onChange(columns.map((col) => (col.source_name === sourceName ? updated : col)));
    },
    [columns, onChange]
  );

  if (includedColumns.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8 text-gray-500">
          No included columns. Go back to configure columns first.
        </div>
      </div>
    );
  }

  const totalRules = includedColumns.reduce((sum, col) => sum + col.cleaning_rules.length, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      <p className="text-sm text-gray-500">
        {totalRules} cleaning rule{totalRules !== 1 ? 's' : ''} across {includedColumns.length} columns.
        Expand a column to add or remove rules.
      </p>

      <div className="space-y-2">
        {includedColumns.map((col) => (
          <ColumnRules
            key={col.source_name}
            column={col}
            isExpanded={expandedColumn === col.source_name}
            onToggle={() =>
              setExpandedColumn(expandedColumn === col.source_name ? null : col.source_name)
            }
            onUpdate={(updated) => updateColumn(col.source_name, updated)}
          />
        ))}
      </div>
    </div>
  );
}
