/**
 * New Data Source Page
 * Wraps the DataSourceWizard in AppLayout
 */

import { memo, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { DataSourceWizard } from '../components/data-sources';
import { useNavigation } from '../hooks/useNavigation';
import type { DestinationType } from '../types/dataImport';

const VALID_DESTINATIONS: DestinationType[] = ['members', 'transactions', 'visits', 'custom'];

export const DataSourceNewPage = memo(function DataSourceNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { navItems } = useNavigation();

  const initialDestination = useMemo(() => {
    const dest = searchParams.get('destination');
    return dest && VALID_DESTINATIONS.includes(dest as DestinationType)
      ? (dest as DestinationType)
      : undefined;
  }, [searchParams]);

  const handleComplete = useCallback(() => {
    navigate('/import');
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate('/import');
  }, [navigate]);

  return (
    <AppLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto">
        <DataSourceWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          initialDestination={initialDestination}
        />
      </div>
    </AppLayout>
  );
});

export default DataSourceNewPage;
