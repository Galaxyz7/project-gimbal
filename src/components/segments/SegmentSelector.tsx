/**
 * Segment Selector
 * Dropdown to select a saved audience segment for campaign targeting
 */

import { Select } from '../common/Select';
import { useSegments } from '@/services/segments';

// =============================================================================
// Types
// =============================================================================

export interface SegmentSelectorProps {
  value: string | null;
  onChange: (segmentId: string | null) => void;
  placeholder?: string;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function SegmentSelector({ value, onChange, placeholder, className = '' }: SegmentSelectorProps) {
  const { data: segments, isLoading } = useSegments();

  const defaultLabel = placeholder ?? 'None (use manual targeting)';

  const options = [
    { value: '', label: isLoading ? 'Loading...' : defaultLabel },
    ...(segments ?? []).map((s) => ({
      value: s.id,
      label: `${s.name} (${s.estimatedSize.toLocaleString()} members)`,
    })),
  ];

  return (
    <Select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      options={options}
      hideLabel
      className={className}
    />
  );
}
