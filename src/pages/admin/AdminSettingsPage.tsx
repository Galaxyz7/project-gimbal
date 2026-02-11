/**
 * Admin Settings Page
 * Application settings and audit log management
 */

import { memo } from 'react';
import { AppLayout } from '../../components/layout';
import { SettingsForm, AuditLogViewer } from '../../components/admin';
import { PageHeader } from '../../components/common/PageHeader';
import { Tabs } from '../../components/common/Tabs';
import { useNavigation } from '../../hooks/useNavigation';
import type { Tab } from '../../components/common/Tabs';

// =============================================================================
// Component
// =============================================================================

const tabs: Tab[] = [
  { id: 'settings', label: 'Application Settings', content: <SettingsForm /> },
  { id: 'audit', label: 'Audit Log', content: <AuditLogViewer /> },
];

export const AdminSettingsPage = memo(function AdminSettingsPage() {
  const { navItems } = useNavigation();

  return (
    <AppLayout
      navItems={navItems}
    >
      <PageHeader
        title="Settings"
        description="Configure application settings and view audit logs"
      />

      <Tabs tabs={tabs} defaultTab="settings" />
    </AppLayout>
  );
});

export default AdminSettingsPage;
