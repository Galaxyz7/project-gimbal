/**
 * useNavigation Hook
 * Provides filtered navigation items based on user role
 */

import { useMemo } from 'react';
import { NAV_ITEMS, HELP_NAV_ITEM, type NavItemConfig } from '@/constants/navigation';
import { useCurrentRole } from './useProfile';
import { hasMinimumRole, type UserRole } from '@/types/admin';
import type { NavItem } from '@/components/layout/Sidebar';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Recursively filter nav items based on user role
 */
function filterNavItems(items: NavItemConfig[], userRole: UserRole | null): NavItem[] {
  return items
    .filter((item) => {
      // No role requirement - visible to all
      if (!item.requiredRole) return true;
      // No user role - hide role-gated items
      if (!userRole) return false;
      // Check if user meets minimum role requirement
      return hasMinimumRole(userRole, item.requiredRole);
    })
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      icon: item.icon,
      badge: item.badge,
      disabled: item.disabled,
      requiredRole: item.requiredRole,
      // Recursively filter children
      children: item.children ? filterNavItems(item.children, userRole) : undefined,
    }));
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that returns filtered navigation items based on the current user's role.
 *
 * @example
 * function MyPage() {
 *   const { navItems, isLoading } = useNavigation();
 *   return <AppLayout navItems={navItems}>...</AppLayout>;
 * }
 */
export function useNavigation() {
  const { data: currentRole, isLoading } = useCurrentRole();

  const filteredNavItems = useMemo(
    () => filterNavItems(NAV_ITEMS, currentRole ?? null),
    [currentRole]
  );

  const helpItem: NavItem = {
    id: HELP_NAV_ITEM.id,
    label: HELP_NAV_ITEM.label,
    href: HELP_NAV_ITEM.href,
    icon: HELP_NAV_ITEM.icon,
  };

  return {
    /** Filtered navigation items based on user role */
    navItems: filteredNavItems,
    /** Help nav item for sidebar footer */
    helpItem,
    /** Whether the role is still loading */
    isLoading,
  };
}

export default useNavigation;
