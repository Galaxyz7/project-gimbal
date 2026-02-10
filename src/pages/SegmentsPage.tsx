/**
 * Segments Page
 * Manage audience segments for campaign targeting
 */

import { memo, useState } from 'react';
import { AppLayout } from '../components/layout';
import { SegmentList } from '../components/segments/SegmentList';
import { SegmentBuilder } from '../components/segments/SegmentBuilder';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { PlusIcon } from '../components/common/icons';
import { useNavigation } from '../hooks/useNavigation';
import type { AudienceSegment } from '@/types/segment';

// =============================================================================
// Component
// =============================================================================

type View = 'list' | 'create' | 'edit';

export const SegmentsPage = memo(function SegmentsPage() {
  const { navItems } = useNavigation();
  const [view, setView] = useState<View>('list');
  const [editingSegment, setEditingSegment] = useState<AudienceSegment | undefined>();

  const handleCreate = () => {
    setEditingSegment(undefined);
    setView('create');
  };

  const handleEdit = (segment: AudienceSegment) => {
    setEditingSegment(segment);
    setView('edit');
  };

  const handleSuccess = () => {
    setView('list');
    setEditingSegment(undefined);
  };

  const handleCancel = () => {
    setView('list');
    setEditingSegment(undefined);
  };

  return (
    <AppLayout navItems={navItems}>
      {view === 'list' && (
        <>
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
        </>
      )}

      {(view === 'create' || view === 'edit') && (
        <>
          <PageHeader
            title={view === 'edit' ? 'Edit Segment' : 'New Segment'}
          />
          <SegmentBuilder
            segment={editingSegment}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </>
      )}
    </AppLayout>
  );
});

export default SegmentsPage;
