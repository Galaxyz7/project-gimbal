/**
 * New Data Source Page
 * Wraps the DataSourceWizard in AppLayout
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { DataSourceWizard } from '../components/data-sources';
import { useNavigation } from '../hooks/useNavigation';

export const DataSourceNewPage = memo(function DataSourceNewPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleComplete = useCallback(() => {
    navigate('/data-sources');
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate('/data-sources');
  }, [navigate]);

  return (
    <AppLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto">
        <DataSourceWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </AppLayout>
  );
});

export default DataSourceNewPage;
