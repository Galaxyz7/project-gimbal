/**
 * Campaigns Page
 * List view of all campaigns with create button
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { CampaignList } from '../components/campaigns';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { PlusIcon } from '../components/common/icons';
import { useNavigation } from '../hooks/useNavigation';

// =============================================================================
// Component
// =============================================================================

export const CampaignsPage = memo(function CampaignsPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleCreateCampaign = useCallback(() => {
    navigate('/campaigns/new');
  }, [navigate]);

  const handleSelectCampaign = useCallback(
    (campaignId: string) => {
      navigate(`/campaigns/${campaignId}`);
    },
    [navigate]
  );

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Campaigns"
        description="Create and manage SMS and email marketing campaigns"
        actions={
          <Button onClick={handleCreateCampaign} leftIcon={<PlusIcon />}>
            Create Campaign
          </Button>
        }
      />

      <CampaignList
        onSelect={handleSelectCampaign}
        onCreate={handleCreateCampaign}
      />
    </AppLayout>
  );
});

export default CampaignsPage;
