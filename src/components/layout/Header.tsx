import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { Dropdown } from '../common/Dropdown';
import type { DropdownItem, DropdownEntry } from '../common/Dropdown';
import { useAuthStore } from '../../stores/authStore';
import { useIsAdmin } from '../../hooks/useProfile';

// =============================================================================
// Types
// =============================================================================

export interface HeaderUser {
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

export interface HeaderProps {
  /** Current page title */
  title?: string;
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Called when mobile menu button is clicked */
  onMobileMenuClick?: () => void;
  /** Whether to show mobile menu button */
  showMobileMenu?: boolean;
  /** Custom actions to show in header */
  actions?: ReactNode;
  /** Called when search button is clicked (Ctrl+K) */
  onSearchClick?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

interface BreadcrumbsProps {
  items: NonNullable<HeaderProps['breadcrumbs']>;
}

function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {index > 0 && (
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {item.href ? (
            <a
              href={item.href}
              className="text-gray-500 hover:text-[#0353a4] transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-[#003559] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { isAdmin } = useIsAdmin();

  const displayName = user?.email?.split('@')[0] || 'User';

  const items: DropdownEntry[] = useMemo(() => {
    const entries: DropdownEntry[] = [];

    if (isAdmin) {
      entries.push({
        key: 'settings',
        label: 'Settings',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        ),
        onClick: () => navigate('/admin/settings'),
      });
      entries.push({ key: 'div-1', divider: true });
    }

    entries.push({
      key: 'signout',
      label: 'Sign out',
      danger: true,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
        </svg>
      ),
      onClick: async () => {
        await signOut();
        navigate('/login');
      },
    });

    return entries;
  }, [isAdmin, navigate, signOut]);

  if (!user) return null;

  return (
    <Dropdown
      trigger={
        <div
          className={[
            'flex items-center gap-3 p-1.5 rounded-lg',
            'hover:bg-[#b9d6f2]/30 transition-colors',
          ].join(' ')}
        >
          <Avatar name={displayName} size="sm" />
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-[#003559] truncate max-w-[120px]">
              {displayName}
            </p>
          </div>
          <svg
            className="hidden md:block w-4 h-4 text-gray-500"
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
      }
      items={items}
      align="right"
    />
  );
}

function CreateButton() {
  const navigate = useNavigate();

  const items: DropdownItem[] = useMemo(
    () => [
      {
        key: 'campaign',
        label: 'New Campaign',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v6.114A4.369 4.369 0 005 11c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        ),
        onClick: () => navigate('/campaigns/new'),
      },
      {
        key: 'import',
        label: 'Import Data',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
          </svg>
        ),
        onClick: () => navigate('/import/new'),
      },
      {
        key: 'segment',
        label: 'Create Segment',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
          </svg>
        ),
        onClick: () => navigate('/segments'),
      },
    ],
    [navigate]
  );

  return (
    <Dropdown
      trigger={
        <Button size="sm">
          <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create
        </Button>
      }
      items={items}
      align="right"
    />
  );
}

function MobileMenuButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'lg:hidden p-2 rounded-lg text-gray-500',
        'hover:bg-[#b9d6f2]/30 hover:text-[#003559]',
        'focus:outline-none focus:ring-2 focus:ring-[#0353a4]',
        'transition-colors',
      ].join(' ')}
      aria-label="Open menu"
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Header component for the application layout.
 * Handles user menu (Settings + Logout) internally — no prop drilling needed.
 *
 * @example
 * <Header title="Dashboard" />
 *
 * @example
 * <Header
 *   breadcrumbs={[
 *     { label: 'Campaigns', href: '/campaigns' },
 *     { label: 'New Campaign' },
 *   ]}
 *   actions={<Button>Create Campaign</Button>}
 * />
 */
export function Header({
  title,
  breadcrumbs,
  onMobileMenuClick,
  showMobileMenu = true,
  actions,
  onSearchClick,
  className = '',
}: HeaderProps) {
  const user = useAuthStore((state) => state.user);

  return (
    <header
      className={[
        'flex items-center justify-between h-16 px-4 lg:px-6',
        'bg-white border-b border-[#e0e0e0]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {showMobileMenu && <MobileMenuButton onClick={onMobileMenuClick} />}

        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} />
        ) : title ? (
          <h1 className="text-lg font-semibold text-[#003559]">{title}</h1>
        ) : null}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search button */}
        {user && onSearchClick && (
          <button
            type="button"
            onClick={onSearchClick}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-[#f5f5f5] border border-[#e0e0e0] rounded-lg hover:bg-white hover:border-[#b9d6f2] transition-colors"
            aria-label="Search (Ctrl+K)"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-white border border-[#e0e0e0] rounded">
              Ctrl+K
            </kbd>
          </button>
        )}

        {/* Global create button */}
        {user && <CreateButton />}

        {/* Custom actions */}
        {actions}

        {/* User menu — self-contained, handles Settings + Logout */}
        {user && <UserMenu />}
      </div>
    </header>
  );
}

export default Header;
