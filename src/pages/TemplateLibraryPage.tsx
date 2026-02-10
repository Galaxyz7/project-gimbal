/**
 * Template Library Page
 * Browse and use starter and custom campaign templates
 */

import { memo } from 'react';
import { AppLayout } from '../components/layout';
import { TemplateLibrary } from '../components/campaigns/TemplateLibrary';
import { PageHeader } from '../components/common/PageHeader';
import { useNavigation } from '../hooks/useNavigation';

// =============================================================================
// Component
// =============================================================================

export const TemplateLibraryPage = memo(function TemplateLibraryPage() {
  const { navItems } = useNavigation();

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Template Library"
        description="Browse starter templates or create your own to speed up campaign creation"
      />

      <TemplateLibrary />
    </AppLayout>
  );
});

export default TemplateLibraryPage;
