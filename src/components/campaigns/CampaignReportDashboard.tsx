/**
 * Campaign Report Dashboard
 * Comprehensive reporting view with timeline, funnel, top engaged, errors,
 * campaign comparison, and device breakdown
 */

import { useState, useCallback, useMemo } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Select } from '../common/Select';
import { LineChart } from '../dashboard/LineChart';
import type { LineChartDataPoint } from '../dashboard/LineChart';
import { DonutChart } from '../dashboard/DonutChart';
import { DataTable } from '../dashboard/DataTable';
import type { DataTableColumn } from '../dashboard/DataTable';
import {
  useCampaigns,
  useCampaignMetrics,
  useCampaignTimeline,
  useCampaignFunnel,
  useTopEngaged,
  useCampaignErrorSummary,
  useCampaignDeviceBreakdown,
} from '@/services/campaigns';
import { campaignReportService } from '@/services/campaigns';
import type {
  CampaignType,
  CampaignFunnelStage,
  TopEngagedRecipient,
  CampaignErrorSummary,
} from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface CampaignReportDashboardProps {
  campaignId: string;
  campaignType: CampaignType;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDelta(current: number, comparison: number): string {
  const diff = current - comparison;
  if (Math.abs(diff) < 0.1) return '0.0pp';
  const arrow = diff > 0 ? '\u2191' : '\u2193';
  return `${arrow} ${Math.abs(diff).toFixed(1)}pp`;
}

function downloadCsv(rows: Array<Record<string, unknown>>, filename: string) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = String(row[h] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(','),
    ),
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// =============================================================================
// Sub-components
// =============================================================================

function SummaryCard({
  label,
  value,
  subValue,
  color = 'default',
  comparisonValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
  comparisonValue?: string;
}) {
  const colorClasses = {
    default: 'text-[#003559]',
    success: 'text-[#2e7d32]',
    warning: 'text-[#ed6c02]',
    danger: 'text-[#d32f2f]',
  };

  return (
    <div className="text-center p-4 bg-[#f5f5f5] rounded-lg">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      {comparisonValue && (
        <p className="text-xs text-gray-400 mt-1">vs comparison: {comparisonValue}</p>
      )}
    </div>
  );
}

function FunnelBar({ stage }: { stage: CampaignFunnelStage }) {
  const stageLabels: Record<string, string> = {
    queued: 'Queued',
    sent: 'Sent',
    delivered: 'Delivered',
    opened: 'Opened',
    clicked: 'Clicked',
  };

  const stageColors: Record<string, string> = {
    queued: 'bg-gray-400',
    sent: 'bg-[#006daa]',
    delivered: 'bg-[#0353a4]',
    opened: 'bg-[#2e7d32]',
    clicked: 'bg-[#003559]',
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-24 text-right">
        {stageLabels[stage.stage] ?? stage.stage}
      </span>
      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
        <div
          className={`h-full ${stageColors[stage.stage] ?? 'bg-[#0353a4]'} transition-all duration-500 rounded-lg`}
          style={{ width: `${Math.max(stage.rate, 1)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
          {stage.count.toLocaleString()} ({formatRate(stage.rate)})
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function CampaignReportDashboard({
  campaignId,
  campaignType,
  className = '',
}: CampaignReportDashboardProps) {
  const [comparisonCampaignId, setComparisonCampaignId] = useState<string | null>(null);

  // Primary campaign data
  const { data: metrics, isLoading: metricsLoading } = useCampaignMetrics(campaignId);
  const { data: timeline, isLoading: timelineLoading } = useCampaignTimeline(campaignId);
  const { data: funnel, isLoading: funnelLoading } = useCampaignFunnel(campaignId);
  const { data: topEngaged, isLoading: engagedLoading } = useTopEngaged(campaignId);
  const { data: errors, isLoading: errorsLoading } = useCampaignErrorSummary(campaignId);
  const { data: deviceBreakdown } = useCampaignDeviceBreakdown(campaignId);

  // Comparison campaign data
  const { data: comparisonMetrics } = useCampaignMetrics(comparisonCampaignId ?? '');
  const { data: comparisonTimeline } = useCampaignTimeline(comparisonCampaignId ?? '');

  // Available campaigns for comparison (same type, sent/completed, excluding current)
  const { data: allCampaigns } = useCampaigns({ campaignType });
  const comparisonOptions = useMemo(() => {
    const opts = [{ value: '', label: 'None' }];
    if (allCampaigns) {
      for (const c of allCampaigns) {
        if (c.id === campaignId) continue;
        if (!['sent', 'completed', 'sending'].includes(c.status)) continue;
        opts.push({ value: c.id, label: c.name });
      }
    }
    return opts;
  }, [allCampaigns, campaignId]);

  // ---------------------------------------------------------------------------
  // Chart data
  // ---------------------------------------------------------------------------

  const timelineData: LineChartDataPoint[] = useMemo(() => {
    if (!timeline?.length) return [];
    return timeline.map((point, idx) => {
      const base: LineChartDataPoint = {
        name: new Date(point.timeBucket).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        delivered: point.delivered,
        failed: point.failed,
      };

      if (campaignType === 'email') {
        base.opened = point.opened;
        base.clicked = point.clicked;
      }

      // Overlay comparison data aligned by bucket index
      if (comparisonTimeline?.[idx]) {
        const cp = comparisonTimeline[idx];
        base.cmpDelivered = cp.delivered;
        if (campaignType === 'email') {
          base.cmpOpened = cp.opened;
        }
      }

      return base;
    });
  }, [timeline, comparisonTimeline, campaignType]);

  const timelineSeries = useMemo(() => {
    const base = [
      { dataKey: 'delivered', name: 'Delivered', color: '#2e7d32' },
      { dataKey: 'failed', name: 'Failed', color: '#d32f2f', dashed: true },
    ];
    if (campaignType === 'email') {
      base.push(
        { dataKey: 'opened', name: 'Opened', color: '#0353a4', dashed: false },
        { dataKey: 'clicked', name: 'Clicked', color: '#003559', dashed: false },
      );
    }
    if (comparisonCampaignId) {
      base.push(
        { dataKey: 'cmpDelivered', name: 'Cmp. Delivered', color: '#2e7d32', dashed: true },
      );
      if (campaignType === 'email') {
        base.push(
          { dataKey: 'cmpOpened', name: 'Cmp. Opened', color: '#0353a4', dashed: true },
        );
      }
    }
    return base;
  }, [campaignType, comparisonCampaignId]);

  const statusDonutData = useMemo(() => {
    if (!metrics) return [];
    const data = [
      { name: 'Delivered', value: metrics.totalDelivered, color: '#2e7d32' },
      { name: 'Failed', value: metrics.totalFailed, color: '#d32f2f' },
      { name: 'Bounced', value: metrics.totalBounced, color: '#ed6c02' },
    ];
    const pending = metrics.totalRecipients - metrics.totalSent;
    if (pending > 0) {
      data.push({ name: 'Pending', value: pending, color: '#b9d6f2' });
    }
    return data.filter((d) => d.value > 0);
  }, [metrics]);

  const deviceDonutData = useMemo(() => {
    if (!deviceBreakdown?.length) return [];
    const colors: Record<string, string> = {
      desktop: '#0353a4',
      mobile: '#2e7d32',
      tablet: '#ed6c02',
      unknown: '#9e9e9e',
    };
    return deviceBreakdown.map((d) => ({
      name: d.deviceType.charAt(0).toUpperCase() + d.deviceType.slice(1),
      value: d.count,
      color: colors[d.deviceType] ?? '#9e9e9e',
    }));
  }, [deviceBreakdown]);

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------

  const engagedColumns: DataTableColumn<TopEngagedRecipient>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        accessor: (row) =>
          [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Unknown',
        sortable: true,
        sortAccessor: (row) => row.lastName ?? '',
      },
      {
        key: 'contact',
        header: 'Contact',
        accessor: (row) => row.email ?? row.phone ?? '-',
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (row) => (
          <Badge variant={row.status === 'clicked' ? 'success' : 'info'}>
            {row.status === 'clicked' ? 'Clicked' : 'Opened'}
          </Badge>
        ),
      },
      {
        key: 'openedAt',
        header: 'Opened',
        accessor: (row) =>
          row.openedAt ? new Date(row.openedAt).toLocaleString() : '-',
        sortable: true,
        sortAccessor: (row) => row.openedAt ?? '',
      },
      {
        key: 'clickedAt',
        header: 'Clicked',
        accessor: (row) =>
          row.clickedAt ? new Date(row.clickedAt).toLocaleString() : '-',
        sortable: true,
        sortAccessor: (row) => row.clickedAt ?? '',
      },
    ],
    [],
  );

  const errorColumns: DataTableColumn<CampaignErrorSummary>[] = useMemo(
    () => [
      {
        key: 'error',
        header: 'Error',
        accessor: (row) => (
          <span className="text-sm text-[#d32f2f]">{row.errorMessage}</span>
        ),
      },
      {
        key: 'count',
        header: 'Count',
        accessor: (row) => row.count.toLocaleString(),
        sortable: true,
        sortAccessor: (row) => row.count,
        align: 'right' as const,
      },
      {
        key: 'lastOccurred',
        header: 'Last Occurred',
        accessor: (row) =>
          row.lastOccurred ? new Date(row.lastOccurred).toLocaleString() : '-',
        sortable: true,
        sortAccessor: (row) => row.lastOccurred,
      },
    ],
    [],
  );

  // ---------------------------------------------------------------------------
  // CSV export
  // ---------------------------------------------------------------------------

  const handleExport = useCallback(async () => {
    const rows = await campaignReportService.getCampaignMessagesForExport(campaignId);
    downloadCsv(rows, `campaign-${campaignId}-messages.csv`);
  }, [campaignId]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isLoading = metricsLoading || timelineLoading || funnelLoading;

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className={className} padding="lg">
        <p className="text-gray-500 text-center py-8">
          No report data available. Reports appear after the campaign is sent.
        </p>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with export + comparison */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-[#003559]">Campaign Report</h3>
        <div className="flex items-center gap-3">
          {comparisonOptions.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 whitespace-nowrap">Compare to:</span>
              <Select
                value={comparisonCampaignId ?? ''}
                onChange={(e) => setComparisonCampaignId(e.target.value || null)}
                options={comparisonOptions}
                hideLabel
                className="w-48"
              />
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard
          label="Delivery Rate"
          value={formatRate(metrics.deliveryRate)}
          subValue={`${metrics.totalDelivered.toLocaleString()} delivered`}
          color="success"
          comparisonValue={comparisonMetrics ? formatDelta(metrics.deliveryRate, comparisonMetrics.deliveryRate) : undefined}
        />
        {campaignType === 'email' ? (
          <SummaryCard
            label="Open Rate"
            value={formatRate(metrics.openRate)}
            subValue={`${metrics.totalOpened.toLocaleString()} opened`}
            color="success"
            comparisonValue={comparisonMetrics ? formatDelta(metrics.openRate, comparisonMetrics.openRate) : undefined}
          />
        ) : (
          <SummaryCard
            label="Total Sent"
            value={metrics.totalSent.toLocaleString()}
            subValue={`of ${metrics.totalRecipients.toLocaleString()}`}
          />
        )}
        {campaignType === 'email' && (
          <SummaryCard
            label="Click Rate"
            value={formatRate(metrics.clickRate)}
            subValue={`${metrics.totalClicked.toLocaleString()} clicked`}
            color="success"
            comparisonValue={comparisonMetrics ? formatDelta(metrics.clickRate, comparisonMetrics.clickRate) : undefined}
          />
        )}
        <SummaryCard
          label="Failed"
          value={metrics.totalFailed.toLocaleString()}
          subValue={metrics.totalBounced > 0 ? `${metrics.totalBounced} bounced` : undefined}
          color={metrics.totalFailed > 0 ? 'danger' : 'default'}
        />
        <SummaryCard
          label={campaignType === 'email' ? 'Unsubscribe Rate' : 'Opted Out'}
          value={campaignType === 'email' ? formatRate(metrics.unsubscribeRate) : metrics.totalUnsubscribed.toLocaleString()}
          subValue={campaignType === 'email' ? `${metrics.totalUnsubscribed.toLocaleString()} unsubscribed` : undefined}
          color={metrics.unsubscribeRate > 2 ? 'warning' : 'default'}
        />
        {campaignType === 'sms' && (
          <SummaryCard
            label="Bounce Rate"
            value={formatRate(metrics.bounceRate)}
            color={metrics.bounceRate > 5 ? 'warning' : 'default'}
          />
        )}
      </div>

      {/* Delivery Timeline & Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LineChart
            title="Delivery Timeline"
            data={timelineData}
            series={timelineSeries}
            height={300}
            loading={timelineLoading}
          />
        </div>
        <div>
          <DonutChart
            title="Message Status"
            data={statusDonutData}
            height={300}
            centerLabel={metrics.totalSent.toLocaleString()}
            centerSublabel="Total Sent"
          />
        </div>
      </div>

      {/* Device Breakdown (email only) */}
      {campaignType === 'email' && deviceDonutData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <DonutChart
              title="Device Breakdown"
              data={deviceDonutData}
              height={250}
            />
          </div>
          <div className="lg:col-span-2">
            <Card padding="lg">
              <h3 className="text-lg font-medium text-[#003559] mb-4">Opens by Device</h3>
              <div className="space-y-3">
                {deviceBreakdown?.map((d) => (
                  <div key={d.deviceType} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-20 capitalize">{d.deviceType}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-[#0353a4] rounded transition-all duration-500"
                        style={{ width: `${Math.max(d.rate, 1)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-24 text-right">
                      {d.count.toLocaleString()} ({formatRate(d.rate)})
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Engagement Funnel */}
      {funnel && funnel.length > 0 && (
        <Card padding="lg">
          <h3 className="text-lg font-medium text-[#003559] mb-4">Delivery Funnel</h3>
          <div className="space-y-3">
            {funnel.map((stage) => (
              <FunnelBar key={stage.stage} stage={stage} />
            ))}
          </div>
        </Card>
      )}

      {/* Top Engaged Recipients (email only) */}
      {campaignType === 'email' && topEngaged && topEngaged.length > 0 && (
        <DataTable<TopEngagedRecipient>
          title="Top Engaged Recipients"
          data={topEngaged}
          columns={engagedColumns}
          rowKey={(row) => row.memberId}
          pageSize={10}
          loading={engagedLoading}
          emptyMessage="No engagement data yet"
        />
      )}

      {/* Error Summary */}
      {errors && errors.length > 0 && (
        <DataTable<CampaignErrorSummary>
          title="Error Summary"
          data={errors}
          columns={errorColumns}
          rowKey={(row) => row.errorMessage}
          pageSize={5}
          loading={errorsLoading}
          emptyMessage="No errors"
        />
      )}
    </div>
  );
}

export default CampaignReportDashboard;
