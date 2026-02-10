/**
 * Segment List
 * Displays saved audience segments split into starter (system) and user segments
 */

import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Skeleton } from '../Skeleton';
import { EmptyState } from '../common/EmptyState';
import { useSegments, useDeleteSegment, useDuplicateSegment } from '@/services/segments';
import type { AudienceSegment } from '@/types/segment';

// =============================================================================
// Types
// =============================================================================

export interface SegmentListProps {
  onSelect?: (segment: AudienceSegment) => void;
  onEdit?: (segment: AudienceSegment) => void;
  onCreate?: () => void;
  className?: string;
}

// =============================================================================
// Sub-component
// =============================================================================

function SegmentCard({
  segment,
  isSystem,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  deletePending,
  duplicatePending,
}: {
  segment: AudienceSegment;
  isSystem: boolean;
  onSelect?: (segment: AudienceSegment) => void;
  onEdit?: (segment: AudienceSegment) => void;
  onDelete: (segment: AudienceSegment) => void;
  onDuplicate?: (segment: AudienceSegment) => void;
  deletePending: boolean;
  duplicatePending: boolean;
}) {
  return (
    <Card
      padding="md"
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect?.(segment)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-[#003559] truncate">
              {segment.name}
            </h3>
            <Badge variant="info">
              {segment.estimatedSize.toLocaleString()} members
            </Badge>
            <Badge variant={segment.rules.logic === 'AND' ? 'default' : 'warning'}>
              {segment.rules.logic}
            </Badge>
            {isSystem && (
              <Badge variant="default">Starter</Badge>
            )}
          </div>
          {segment.description && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{segment.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {segment.rules.conditions.length} condition{segment.rules.conditions.length !== 1 ? 's' : ''}
            {' \u00B7 '}
            Updated {new Date(segment.updatedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {isSystem && onDuplicate && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(segment);
              }}
              disabled={duplicatePending}
            >
              Use as Template
            </Button>
          )}
          {!isSystem && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(segment);
              }}
            >
              Edit
            </Button>
          )}
          {!isSystem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(segment);
              }}
              className="text-gray-400 hover:text-[#d32f2f]"
              disabled={deletePending}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Component
// =============================================================================

export function SegmentList({ onSelect, onEdit, onCreate, className = '' }: SegmentListProps) {
  const { data: segments, isLoading } = useSegments();
  const deleteMutation = useDeleteSegment();
  const duplicateMutation = useDuplicateSegment();

  const systemSegments = segments?.filter((s) => s.isSystem) ?? [];
  const userSegments = segments?.filter((s) => !s.isSystem) ?? [];

  const handleDelete = async (segment: AudienceSegment) => {
    if (window.confirm(`Delete segment "${segment.name}"? This cannot be undone.`)) {
      await deleteMutation.mutateAsync(segment.id);
    }
  };

  const handleDuplicate = async (segment: AudienceSegment) => {
    await duplicateMutation.mutateAsync(segment.id);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <EmptyState
        title="No segments yet"
        description="Create audience segments to reuse targeting rules across campaigns."
        action={onCreate ? { label: 'Create Segment', onClick: onCreate } : undefined}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Starter Segments */}
      {systemSegments.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#003559]">Starter Segments</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Pre-built segments you can use as templates
            </p>
          </div>
          {systemSegments.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              isSystem
              onSelect={onSelect}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              deletePending={deleteMutation.isPending}
              duplicatePending={duplicateMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* User Segments */}
      <div className="space-y-4">
        {systemSegments.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-[#003559]">My Segments</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Custom segments you&apos;ve created
            </p>
          </div>
        )}
        {userSegments.length > 0 ? (
          userSegments.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              isSystem={false}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={handleDelete}
              deletePending={deleteMutation.isPending}
              duplicatePending={duplicateMutation.isPending}
            />
          ))
        ) : (
          <EmptyState
            title="No custom segments yet"
            description="Create your own segment or use a starter template above."
            action={onCreate ? { label: 'Create Segment', onClick: onCreate } : undefined}
          />
        )}
      </div>
    </div>
  );
}
