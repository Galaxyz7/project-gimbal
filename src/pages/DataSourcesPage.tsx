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
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { PlusIcon } from '../components/common/icons';
import { Skeleton } from '../components/Skeleton';
import { DataSourceCard } from '../components/data-sources';
import { syncService } from '../services/data-sources';
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

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

  const handleSync = useCallback(async (id: string) => {
    const ds = dataSources.find((d) => d.id === id);
    if (!ds) return;

    setSyncingId(id);
    setDataSources((prev) =>
      prev.map((d) => (d.id === id ? { ...d, sync_status: 'syncing' as const } : d))
    );

    try {
      await syncService.executeSyncPipeline({
        dataSourceId: ds.id,
        rawRows: [], // Re-sync fetches from source; empty triggers status update
        columnConfig: ds.column_config,
        fieldMappings: ds.field_mappings ?? [],
        destinationType: ds.destination_type ?? 'custom',
        siteId: ds.site_id,
        tableName: ds.table_name ?? undefined,
      });
      await fetchDataSources();
    } catch {
      setDataSources((prev) =>
        prev.map((d) => (d.id === id ? { ...d, sync_status: 'failed' as const } : d))
      );
    } finally {
      setSyncingId(null);
    }
  }, [dataSources, fetchDataSources]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: deleteError } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', deleteId);

    if (!deleteError) {
      setDataSources((prev) => prev.filter((ds) => ds.id !== deleteId));
    }
    setDeleting(false);
    setDeleteId(null);
  }, [deleteId]);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Import"
        description="Connect and manage external data sources"
        actions={
          <Button onClick={() => navigate('/import/new')} leftIcon={<PlusIcon />}>
            New Import
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
              onClick: () => navigate('/import/new'),
            }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {dataSources.map((ds) => (
            <DataSourceCard
              key={ds.id}
              dataSource={ds}
              onDelete={setDeleteId}
              onSync={handleSync}
              syncing={syncingId === ds.id}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Data Source"
        message="Are you sure you want to delete this data source? All imported data and sync history will be permanently removed."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </AppLayout>
  );
});

export default DataSourcesPage;
