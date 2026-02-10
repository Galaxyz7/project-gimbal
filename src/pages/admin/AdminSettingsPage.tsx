/**
 * Admin Settings Page
 * Application settings and audit log management
 */

import { memo, useState } from 'react';
import { AppLayout } from '../../components/layout';
import { SettingsForm, AuditLogViewer } from '../../components/admin';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { useCurrentProfile } from '../../hooks/useProfile';
import { useNavigation } from '../../hooks/useNavigation';

// =============================================================================
// Types
// =============================================================================

type TabId = 'settings' | 'audit';

// =============================================================================
// Component
// =============================================================================

export const AdminSettingsPage = memo(function AdminSettingsPage() {
  const { data: currentUser } = useCurrentProfile();
  const { navItems } = useNavigation();
  const [activeTab, setActiveTab] = useState<TabId>('settings');

  return (
    <AppLayout
      navItems={navItems}
      user={currentUser ? { name: currentUser.displayName || currentUser.email, email: currentUser.email } : null}
    >
      <PageHeader
        title="Settings"
        description="Configure application settings and view audit logs"
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'settings' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveTab('settings')}
        >
          Application Settings
        </Button>
        <Button
          variant={activeTab === 'audit' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveTab('audit')}
        >
          Audit Log
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' && <SettingsForm />}
      {activeTab === 'audit' && <AuditLogViewer />}
    </AppLayout>
  );
});

export default AdminSettingsPage;
