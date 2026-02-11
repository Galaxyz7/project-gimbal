/**
 * Quick Actions Panel
 * Large button cards for common actions: Create Campaign, Import, View Reports
 */

import { useNavigate } from 'react-router-dom';

// =============================================================================
// Component
// =============================================================================

export interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className = '' }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'campaign',
      label: 'Create Campaign',
      description: 'Send an SMS or Email campaign',
      href: '/campaigns/new',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor">
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v6.114A4.369 4.369 0 005 11c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
      ),
    },
    {
      id: 'import',
      label: 'Import Members',
      description: 'Connect a data source',
      href: '/import/new',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
          <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
          <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
        </svg>
      ),
    },
    {
      id: 'audience',
      label: 'View Audience',
      description: 'Browse your member list',
      href: '/audience',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => navigate(action.href)}
          className={[
            'flex flex-col items-center gap-2 p-6 rounded-lg border border-[#e0e0e0]',
            'bg-white hover:bg-[#b9d6f2]/10 hover:border-[#0353a4]/30',
            'transition-all text-center',
          ].join(' ')}
        >
          <span className="text-[#0353a4]">{action.icon}</span>
          <span className="text-sm font-medium text-[#003559]">{action.label}</span>
          <span className="text-xs text-gray-500">{action.description}</span>
        </button>
      ))}
    </div>
  );
}

export default QuickActions;
