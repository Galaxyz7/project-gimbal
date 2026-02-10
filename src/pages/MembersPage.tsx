/**
 * Members Page
 * List view of all members with add and import actions
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { MemberList } from '../components/members';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { PlusIcon, UploadIcon } from '../components/common/icons';
import { useNavigation } from '../hooks/useNavigation';

// =============================================================================
// Component
// =============================================================================

export const MembersPage = memo(function MembersPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleSelectMember = useCallback(
    (memberId: string) => {
      navigate(`/members/${memberId}`);
    },
    [navigate]
  );

  const handleAddMember = useCallback(() => {
    navigate('/members/new');
  }, [navigate]);

  const handleImport = useCallback(() => {
    navigate('/members/import');
  }, [navigate]);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Members"
        description="Manage your member database across all sites"
        actions={
          <>
            <Button variant="outline" onClick={handleImport} leftIcon={<UploadIcon />}>
              Import
            </Button>
            <Button onClick={handleAddMember} leftIcon={<PlusIcon />}>
              Add Member
            </Button>
          </>
        }
      />

      <MemberList
        onSelect={handleSelectMember}
        onImport={handleImport}
      />
    </AppLayout>
  );
});

export default MembersPage;
