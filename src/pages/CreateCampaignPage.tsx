/**
 * Create Campaign Page
 * Form to create a new campaign
 */

import { memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { CampaignForm } from '../components/campaigns';
import { PageHeader } from '../components/common/PageHeader';
import { useNavigation } from '../hooks/useNavigation';
import type { Campaign, CampaignType } from '../types/campaign';

// =============================================================================
// Component
// =============================================================================

export const CreateCampaignPage = memo(function CreateCampaignPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { navItems } = useNavigation();

  // Get campaign type from query param (?type=sms|email)
  const typeParam = searchParams.get('type') as CampaignType | null;
  const campaignType = typeParam === 'sms' || typeParam === 'email' ? typeParam : undefined;

  const handleSuccess = useCallback(
    (campaign: Campaign) => {
      navigate(`/campaigns/${campaign.id}`);
    },
    [navigate]
  );

  const handleCancel = useCallback(() => {
    navigate('/campaigns');
  }, [navigate]);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Create Campaign"
        description="Set up a new SMS or email marketing campaign"
      />

      <CampaignForm
        campaignType={campaignType}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        className="max-w-3xl"
      />
    </AppLayout>
  );
});

export default CreateCampaignPage;
