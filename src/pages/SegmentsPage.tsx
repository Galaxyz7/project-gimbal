/**
 * Segments Page
 * Manage audience segments for campaign targeting
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { SegmentList } from '../components/segments/SegmentList';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { PlusIcon } from '../components/common/icons';
import { useNavigation } from '../hooks/useNavigation';
import { useHotkey } from '../hooks/useHotkey';
import type { AudienceSegment } from '@/types/segment';

// =============================================================================
// Component
// =============================================================================

export const SegmentsPage = memo(function SegmentsPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleCreate = useCallback(() => {
    navigate('/segments/new');
  }, [navigate]);

  const handleEdit = useCallback(
    (segment: AudienceSegment) => {
      navigate(`/segments/${segment.id}`);
    },
    [navigate]
  );

  // Keyboard shortcuts
  useHotkey('n', handleCreate);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Audience Segments"
        description="Create reusable audience segments for campaign targeting"
        actions={
          <Button onClick={handleCreate} leftIcon={<PlusIcon />}>
            Create Segment
          </Button>
        }
      />

      <SegmentList onEdit={handleEdit} onCreate={handleCreate} />
    </AppLayout>
  );
});

export default SegmentsPage;
