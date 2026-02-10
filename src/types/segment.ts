/**
 * Audience Segment Type Definitions
 * Types for segment rules, conditions, and CRUD
 */

// =============================================================================
// Segment Rule Types
// =============================================================================

export type SegmentFieldType = 'string' | 'number' | 'date' | 'array';

export type SegmentOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'after'
  | 'before'
  | 'in_last_days'
  | 'is_empty'
  | 'is_not_empty';

export interface SegmentCondition {
  id: string;
  field: string;
  operator: SegmentOperator;
  value: string;
}

export type SegmentLogic = 'AND' | 'OR';

export interface SegmentRuleGroup {
  logic: SegmentLogic;
  conditions: SegmentCondition[];
  groups?: SegmentRuleGroup[];
}

// =============================================================================
// Segment Field Definitions
// =============================================================================

export interface SegmentFieldDef {
  key: string;
  label: string;
  type: SegmentFieldType;
  operators: SegmentOperator[];
}

export const SEGMENT_FIELDS: SegmentFieldDef[] = [
  {
    key: 'membershipStatus',
    label: 'Membership Status',
    type: 'string',
    operators: ['equals', 'not_equals'],
  },
  {
    key: 'membershipLevelId',
    label: 'Membership Level',
    type: 'string',
    operators: ['equals'],
  },
  {
    key: 'lifetimeValue',
    label: 'Lifetime Value',
    type: 'number',
    operators: ['greater_than', 'less_than'],
  },
  {
    key: 'totalVisits',
    label: 'Total Visits',
    type: 'number',
    operators: ['greater_than', 'less_than'],
  },
  {
    key: 'lastVisitAt',
    label: 'Last Visit',
    type: 'date',
    operators: ['after', 'before', 'in_last_days'],
  },
  {
    key: 'acquisitionSource',
    label: 'Acquisition Source',
    type: 'string',
    operators: ['equals', 'contains'],
  },
  {
    key: 'city',
    label: 'City',
    type: 'string',
    operators: ['equals'],
  },
  {
    key: 'state',
    label: 'State',
    type: 'string',
    operators: ['equals'],
  },
  {
    key: 'tags',
    label: 'Tags',
    type: 'array',
    operators: ['contains', 'not_contains'],
  },
  {
    key: 'emailOpensLast30Days',
    label: 'Email Opens (30d)',
    type: 'number',
    operators: ['greater_than', 'less_than'],
  },
  {
    key: 'emailClicksLast30Days',
    label: 'Email Clicks (30d)',
    type: 'number',
    operators: ['greater_than', 'less_than'],
  },
  {
    key: 'lastEmailOpenedAt',
    label: 'Last Email Opened',
    type: 'date',
    operators: ['after', 'before', 'in_last_days'],
  },
  {
    key: 'lastSmsDeliveredAt',
    label: 'Last SMS Delivered',
    type: 'date',
    operators: ['after', 'before', 'in_last_days'],
  },
];

export const OPERATOR_LABELS: Record<SegmentOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  greater_than: 'is greater than',
  less_than: 'is less than',
  after: 'is after',
  before: 'is before',
  in_last_days: 'in last N days',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
};

export const MEMBERSHIP_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

// =============================================================================
// Segment CRUD Types
// =============================================================================

export interface AudienceSegment {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  rules: SegmentRuleGroup;
  isDynamic: boolean;
  isSystem: boolean;
  estimatedSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSegmentInput {
  name: string;
  description?: string | null;
  rules: SegmentRuleGroup;
  isDynamic?: boolean;
}

export type UpdateSegmentInput = Partial<CreateSegmentInput>;

export interface SegmentPreviewMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  membershipStatus: string;
  lifetimeValue: number;
  totalVisits: number;
  lastVisitAt: string | null;
  city: string | null;
  state: string | null;
}
