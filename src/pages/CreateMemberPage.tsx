/**
 * Create Member Page
 * Form to create a new member
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { MemberForm } from '../components/members';
import { PageHeader } from '../components/common/PageHeader';
import { useNavigation } from '../hooks/useNavigation';
import type { Member } from '../types/member';

// =============================================================================
// Component
// =============================================================================

export const CreateMemberPage = memo(function CreateMemberPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleSuccess = useCallback(
    (member: Member) => {
      navigate(`/members/${member.id}`);
    },
    [navigate]
  );

  const handleCancel = useCallback(() => {
    navigate('/members');
  }, [navigate]);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Add Member"
        description="Create a new member record"
      />

      <MemberForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        className="max-w-3xl"
      />
    </AppLayout>
  );
});

export default CreateMemberPage;
