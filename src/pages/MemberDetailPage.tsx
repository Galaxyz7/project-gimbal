/**
 * Member Detail Page
 * View member details, transactions, and visit history
 */

import { memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { MemberDetail } from '../components/members';
import { useNavigation } from '../hooks/useNavigation';

// =============================================================================
// Component
// =============================================================================

export const MemberDetailPage = memo(function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleBack = useCallback(() => {
    navigate('/audience');
  }, [navigate]);

  if (!id) {
    return (
      <AppLayout navItems={navItems}>
        <div className="text-center py-12">
          <p className="text-[#d32f2f]">Member ID is required</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout navItems={navItems}>
      <MemberDetail
        memberId={id}
        onBack={handleBack}
      />
    </AppLayout>
  );
});

export default MemberDetailPage;
