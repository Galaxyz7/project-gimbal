/**
 * SegmentOverlapDialog - Compare two segments for member overlap
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../common/Modal';
import { Skeleton } from '../Skeleton';
import { Badge } from '../common/Badge';
import { segmentKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import type { AudienceSegment } from '@/services/segments';

// =============================================================================
// Types
// =============================================================================

export interface SegmentOverlapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  segmentA: AudienceSegment | null;
  segmentB: AudienceSegment | null;
}

interface OverlapResult {
  overlapCount: number;
  aOnlyCount: number;
  bOnlyCount: number;
  aTotal: number;
  bTotal: number;
}

// =============================================================================
// Service
// =============================================================================

async function getSegmentOverlap(idA: string, idB: string): Promise<OverlapResult> {
  const { data, error } = await supabase.rpc('get_segment_overlap', {
    p_segment_id_a: idA,
    p_segment_id_b: idB,
  });

  if (error) throw new Error(`Failed to get segment overlap: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  return {
    overlapCount: Number(row.overlap_count),
    aOnlyCount: Number(row.a_only_count),
    bOnlyCount: Number(row.b_only_count),
    aTotal: Number(row.a_total),
    bTotal: Number(row.b_total),
  };
}

// =============================================================================
// Hook
// =============================================================================

function useSegmentOverlap(idA: string | undefined, idB: string | undefined) {
  return useQuery({
    queryKey: segmentKeys.overlap(idA ?? '', idB ?? ''),
    queryFn: () => getSegmentOverlap(idA!, idB!),
    enabled: !!idA && !!idB,
    staleTime: 60_000,
  });
}

// =============================================================================
// Sub-components
// =============================================================================

function OverlapBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#003559] font-medium">{label}</span>
        <span className="text-gray-500">{value.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function SegmentOverlapDialog({ isOpen, onClose, segmentA, segmentB }: SegmentOverlapDialogProps) {
  const { data: overlap, isLoading, error } = useSegmentOverlap(segmentA?.id, segmentB?.id);

  const overlapPct = useMemo(() => {
    if (!overlap) return 0;
    const unionSize = overlap.aTotal + overlap.bTotal - overlap.overlapCount;
    return unionSize > 0 ? Math.round((overlap.overlapCount / unionSize) * 100) : 0;
  }, [overlap]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Segment Overlap Analysis" size="md">
      {/* Segment Names */}
      <div className="flex items-center gap-3 mb-6">
        <Badge variant="info">{segmentA?.name ?? 'Segment A'}</Badge>
        <span className="text-gray-400">vs</span>
        <Badge variant="secondary">{segmentB?.name ?? 'Segment B'}</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton height={24} />
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-gray-500">
          <p>Failed to calculate overlap. Please try again.</p>
        </div>
      ) : overlap ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="text-center p-4 bg-[#b9d6f2]/20 rounded-lg">
            <div className="text-3xl font-bold text-[#0353a4]">{overlapPct}%</div>
            <div className="text-sm text-gray-500 mt-1">
              {overlap.overlapCount.toLocaleString()} shared members
            </div>
          </div>

          {/* Bars */}
          <div className="space-y-4">
            <OverlapBar
              label="Shared (Overlap)"
              value={overlap.overlapCount}
              total={overlap.aTotal + overlap.bTotal - overlap.overlapCount}
              color="bg-[#0353a4]"
            />
            <OverlapBar
              label={`Only in ${segmentA?.name ?? 'A'}`}
              value={overlap.aOnlyCount}
              total={overlap.aTotal}
              color="bg-[#006daa]"
            />
            <OverlapBar
              label={`Only in ${segmentB?.name ?? 'B'}`}
              value={overlap.bOnlyCount}
              total={overlap.bTotal}
              color="bg-[#b9d6f2]"
            />
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e0e0e0]">
            <div className="text-center">
              <div className="text-sm text-gray-500">{segmentA?.name ?? 'Segment A'}</div>
              <div className="text-lg font-semibold text-[#003559]">{overlap.aTotal.toLocaleString()}</div>
              <div className="text-xs text-gray-400">total members</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">{segmentB?.name ?? 'Segment B'}</div>
              <div className="text-lg font-semibold text-[#003559]">{overlap.bTotal.toLocaleString()}</div>
              <div className="text-xs text-gray-400">total members</div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export default SegmentOverlapDialog;
