/**
 * Segment Detail Page
 * Loads segment by ID from URL params, renders segment builder
 */

import { memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { SegmentBuilder } from '../components/segments/SegmentBuilder';
import { Skeleton } from '../components/Skeleton';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { useNavigation } from '../hooks/useNavigation';
import { useSegment } from '@/services/segments';

// =============================================================================
// Component
// =============================================================================

export const SegmentDetailPage = memo(function SegmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const isNew = !id || id === 'new';
  const { data: segment, isLoading, error } = useSegment(isNew ? '' : id);

  const handleSuccess = useCallback(() => {
    navigate('/segments');
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate('/segments');
  }, [navigate]);

  if (!isNew && isLoading) {
    return (
      <AppLayout navItems={navItems}>
        <div className="space-y-4">
          <Skeleton height={48} />
          <Skeleton height={300} />
        </div>
      </AppLayout>
    );
  }

  if (!isNew && error) {
    return (
      <AppLayout navItems={navItems}>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Failed to load segment</p>
          <Button variant="outline" onClick={() => navigate('/segments')}>
            Back to Segments
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title={isNew ? 'New Segment' : `Edit: ${segment?.name ?? 'Segment'}`}
        actions={
          <Button variant="outline" onClick={handleCancel}>
            Back to Segments
          </Button>
        }
      />

      <SegmentBuilder
        segment={isNew ? undefined : (segment ?? undefined)}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </AppLayout>
  );
});

export default SegmentDetailPage;
