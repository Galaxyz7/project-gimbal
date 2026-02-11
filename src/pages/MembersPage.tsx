/**
 * Audience Page (formerly Members Page)
 * List view of all audience members with add and import actions
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { MemberList } from '../components/members';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { PlusIcon, UploadIcon } from '../components/common/icons';
import { useNavigation } from '../hooks/useNavigation';
import { useHotkey } from '../hooks/useHotkey';

// =============================================================================
// Component
// =============================================================================

export const MembersPage = memo(function MembersPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleSelectMember = useCallback(
    (memberId: string) => {
      navigate(`/audience/${memberId}`);
    },
    [navigate]
  );

  const handleAddMember = useCallback(() => {
    navigate('/audience/new');
  }, [navigate]);

  const handleImport = useCallback(() => {
    navigate('/import/new?destination=members');
  }, [navigate]);

  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]');
    input?.focus();
  }, []);

  // Keyboard shortcuts
  useHotkey('n', handleAddMember);
  useHotkey('/', focusSearch);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Audience"
        description="Manage your audience members across all sites"
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
