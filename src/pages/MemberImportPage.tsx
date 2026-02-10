/**
 * Member Import Page
 * Wizard for importing members from CSV and other sources
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { ImportWizard } from '../components/members/ImportWizard';
import { PageHeader } from '../components/common/PageHeader';
import { useNavigation } from '../hooks/useNavigation';

// =============================================================================
// Component
// =============================================================================

export const MemberImportPage = memo(function MemberImportPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleComplete = useCallback(() => {
    navigate('/members');
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate('/members');
  }, [navigate]);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Import Members"
        description="Import members from CSV files or other data sources"
      />

      <ImportWizard
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </AppLayout>
  );
});

export default MemberImportPage;
