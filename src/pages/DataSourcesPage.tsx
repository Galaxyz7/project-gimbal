/**
 * Data Sources Page
 * Manage external data source connections and imports
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppLayout } from '../components/layout';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { PlusIcon } from '../components/common/icons';
import { Skeleton } from '../components/Skeleton';
import { DataSourceCard } from '../components/data-sources';
import { useNavigation } from '../hooks/useNavigation';
import type { DataSource } from '../types/dataImport';

// =============================================================================
// Component
// =============================================================================

export const DataSourcesPage = memo(function DataSourcesPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('data_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDataSources((data as DataSource[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  const handleDelete = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', id);

    if (!deleteError) {
      setDataSources((prev) => prev.filter((ds) => ds.id !== id));
    }
  }, []);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Data Sources"
        description="Connect and manage external data sources"
        actions={
          <Button onClick={() => navigate('/data-sources/new')} leftIcon={<PlusIcon />}>
            New Data Source
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-[#e0e0e0] p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-sm border border-[#e0e0e0] p-8 text-center">
          <p className="text-[#d32f2f] mb-4">{error}</p>
          <Button variant="outline" onClick={fetchDataSources}>Retry</Button>
        </div>
      ) : dataSources.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-[#e0e0e0]">
          <EmptyState
            title="No Data Sources Connected"
            description="Import CSV files, connect databases, or link analytics platforms to bring data into Gimbal."
            action={{
              label: 'New Data Source',
              onClick: () => navigate('/data-sources/new'),
            }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {dataSources.map((ds) => (
            <DataSourceCard
              key={ds.id}
              dataSource={ds}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
});

export default DataSourcesPage;
