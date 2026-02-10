/**
 * Admin Users Page
 * User management interface for administrators
 */

import { memo, useState, useCallback } from 'react';
import { AppLayout } from '../../components/layout';
import { UserList, UserForm } from '../../components/admin';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { useCurrentProfile } from '../../hooks/useProfile';
import { useNavigation } from '../../hooks/useNavigation';

// =============================================================================
// Component
// =============================================================================

export const AdminUsersPage = memo(function AdminUsersPage() {
  const { data: currentUser } = useCurrentProfile();
  const { navItems } = useNavigation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  return (
    <AppLayout
      navItems={navItems}
      user={currentUser ? { name: currentUser.displayName || currentUser.email, email: currentUser.email } : null}
    >
      <PageHeader
        title="User Management"
        description="Manage user accounts, roles, and permissions"
      />

      <UserList onSelect={handleSelectUser} />

      <Modal
        isOpen={!!selectedUserId}
        onClose={handleCloseModal}
        title="Edit User"
        size="lg"
      >
        {selectedUserId && (
          <UserForm
            userId={selectedUserId}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModal}
          />
        )}
      </Modal>
    </AppLayout>
  );
});

export default AdminUsersPage;
