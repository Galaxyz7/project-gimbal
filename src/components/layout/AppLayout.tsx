import { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import type { NavItem } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../common/CommandPalette';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import { HELP_NAV_ITEM } from '../../constants/navigation';

// =============================================================================
// Types
// =============================================================================

export interface AppLayoutProps {
  /** Main content */
  children: ReactNode;
  /** Navigation items for sidebar */
  navItems: NavItem[];
  /** Current page title */
  pageTitle?: string;
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Custom actions for header */
  headerActions?: ReactNode;
  /** Sidebar logo */
  logo?: ReactNode;
  /** Collapsed sidebar logo */
  logoCollapsed?: ReactNode;
  /** Sidebar footer content */
  sidebarFooter?: ReactNode;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SIDEBAR_COLLAPSED_KEY = 'gimbal-sidebar-collapsed';

// =============================================================================
// Component
// =============================================================================

/**
 * Main application layout with sidebar, header, and content area.
 *
 * @example
 * const navItems: NavItem[] = [
 *   { id: 'dashboard', label: 'Dashboard', href: '/', icon: <DashboardIcon /> },
 *   { id: 'campaigns', label: 'Campaigns', href: '/campaigns', icon: <CampaignIcon /> },
 * ];
 *
 * <AppLayout
 *   navItems={navItems}
 *   pageTitle="Dashboard"
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 * >
 *   <DashboardContent />
 * </AppLayout>
 */
export function AppLayout({
  children,
  navItems,
  pageTitle,
  breadcrumbs,
  headerActions,
  logo,
  logoCollapsed,
  sidebarFooter,
  defaultCollapsed = false,
}: AppLayoutProps) {
  // Sidebar collapsed state - persisted to localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return defaultCollapsed;
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored !== null ? stored === 'true' : defaultCollapsed;
  });

  // Mobile sidebar open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Command palette
  const commandPalette = useCommandPalette();

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Close mobile menu on route change or escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSidebarCollapsedChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  const handleMobileMenuClick = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const helpFooter = sidebarFooter ?? (
    <NavLink
      to={HELP_NAV_ITEM.href}
      title={sidebarCollapsed ? HELP_NAV_ITEM.label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-[#0353a4] text-white'
            : 'text-[#003559] hover:bg-[#b9d6f2]/30',
          sidebarCollapsed ? 'justify-center' : '',
        ].join(' ')
      }
    >
      <span className="shrink-0 w-5 h-5">{HELP_NAV_ITEM.icon}</span>
      {!sidebarCollapsed && <span>{HELP_NAV_ITEM.label}</span>}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={handleMobileMenuClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 lg:hidden',
          'transform transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar
          items={navItems}
          collapsed={false}
          logo={logo}
          footer={helpFooter}
        />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
        <Sidebar
          items={navItems}
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleSidebarCollapsedChange}
          logo={logo}
          logoCollapsed={logoCollapsed}
          footer={helpFooter}
        />
      </div>

      {/* Main content area */}
      <div
        className={[
          'flex flex-col min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64',
        ].join(' ')}
      >
        {/* Header */}
        <Header
          title={pageTitle}
          breadcrumbs={breadcrumbs}
          onMobileMenuClick={handleMobileMenuClick}
          showMobileMenu={true}
          actions={headerActions}
          onSearchClick={commandPalette.open}
        />

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
    </div>
  );
}

export default AppLayout;
