import type { ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface PageHeaderProps {
  /** Page title (rendered as h1) */
  title: string;
  /** Optional subtitle/description */
  description?: string;
  /** Action buttons rendered on the right */
  actions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Standardized page header with title, description, and action buttons.
 * Stacks vertically on mobile, horizontal on sm+ breakpoint.
 *
 * @example
 * <PageHeader
 *   title="Members"
 *   description="Manage your member database"
 *   actions={<Button>Add Member</Button>}
 * />
 */
export function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${className}`.trim()}
    >
      <div>
        <h1 className="text-2xl font-semibold text-[#003559]">{title}</h1>
        {description && (
          <p className="text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
