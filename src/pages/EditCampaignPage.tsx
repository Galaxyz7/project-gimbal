/**
 * Edit Campaign Page
 * Form to edit an existing campaign
 */

import { memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { CampaignForm } from '../components/campaigns';
import { PageHeader } from '../components/common/PageHeader';
import { useNavigation } from '../hooks/useNavigation';
import type { Campaign } from '../types/campaign';

// =============================================================================
// Component
// =============================================================================

export const EditCampaignPage = memo(function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleSuccess = useCallback(
    (campaign: Campaign) => {
      navigate(`/campaigns/${campaign.id}`);
    },
    [navigate]
  );

  const handleCancel = useCallback(() => {
    if (id) {
      navigate(`/campaigns/${id}`);
    } else {
      navigate('/campaigns');
    }
  }, [navigate, id]);

  if (!id) {
    return (
      <AppLayout navItems={navItems}>
        <div className="text-center py-12">
          <p className="text-[#d32f2f]">Campaign ID is required</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Edit Campaign"
        description="Update campaign details and content"
      />

      <CampaignForm
        campaignId={id}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        className="max-w-3xl"
      />
    </AppLayout>
  );
});

export default EditCampaignPage;
