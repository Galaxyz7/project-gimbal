/**
 * Command Palette
 *
 * Global search modal accessible via Ctrl+K / Cmd+K.
 * Searches members, campaigns, and segments in parallel.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { searchAll } from '@/services/search/globalSearchService';
import type { SearchResult } from '@/services/search/globalSearchService';

// =============================================================================
// Types
// =============================================================================

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  url: string;
  icon: React.ReactNode;
}

// =============================================================================
// Constants
// =============================================================================

const ENTITY_LABELS: Record<string, string> = {
  member: 'Members',
  campaign: 'Campaigns',
  segment: 'Segments',
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  member: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  ),
  campaign: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v6.114A4.369 4.369 0 005 11c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
    </svg>
  ),
  segment: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
    </svg>
  ),
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'new-campaign',
    label: 'Create Campaign',
    url: '/campaigns/new',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: 'add-member',
    label: 'Add Member',
    url: '/members/new',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
      </svg>
    ),
  },
  {
    id: 'import-data',
    label: 'Import Data',
    url: '/import/new',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
        <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
        <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
      </svg>
    ),
  },
];

// =============================================================================
// Component
// =============================================================================

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // All selectable items (quick actions when empty, results when searching)
  const items = query.trim()
    ? results
    : QUICK_ACTIONS.map((a) => ({
        entityType: 'action' as const,
        id: a.id,
        title: a.label,
        subtitle: '',
        url: a.url,
      }));

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchAll(trimmed);
        const combined = [
          ...data.members,
          ...data.campaigns,
          ...data.segments,
        ];
        setResults(combined);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    (url: string) => {
      onClose();
      navigate(url);
    },
    [navigate, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(items.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      handleSelect(items[selectedIndex].url);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Group results by entity type for display
  const groupedResults = useMemo(() => {
    if (!query.trim()) return null;
    return (['member', 'campaign', 'segment'] as const)
      .map((type) => ({
        type,
        label: ENTITY_LABELS[type],
        items: results.filter((r) => r.entityType === type),
      }))
      .filter((g) => g.items.length > 0);
  }, [query, results]);

  // Pre-compute flat index map for keyboard nav in grouped view
  const flatIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!groupedResults) return map;
    let idx = 0;
    for (const group of groupedResults) {
      for (const item of group.items) {
        map.set(item.id, idx++);
      }
    }
    return map;
  }, [groupedResults]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-[#e0e0e0]">
          <svg className="w-5 h-5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members, campaigns, segments..."
            className="flex-1 h-12 bg-transparent text-sm text-[#003559] placeholder:text-gray-400 focus:outline-none"
            aria-label="Search"
          />
          {isSearching && (
            <div className="w-4 h-4 border-2 border-[#0353a4] border-t-transparent rounded-full animate-spin" />
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-[#f5f5f5] border border-[#e0e0e0] rounded">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {/* Quick actions when empty */}
          {!query.trim() && (
            <div className="py-2">
              <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase">Quick Actions</p>
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleSelect(action.url)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                    i === selectedIndex
                      ? 'bg-[#0353a4] text-white'
                      : 'text-[#003559] hover:bg-[#f5f5f5]',
                  ].join(' ')}
                >
                  <span className={i === selectedIndex ? 'text-white' : 'text-gray-400'}>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Grouped search results */}
          {groupedResults && groupedResults.length > 0 && (
            <div className="py-2">
              {groupedResults.map((group) => (
                <div key={group.type}>
                  <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase">{group.label}</p>
                  {group.items.map((result) => {
                    const currentIndex = flatIndexMap.get(result.id) ?? 0;
                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleSelect(result.url)}
                        className={[
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                          currentIndex === selectedIndex
                            ? 'bg-[#0353a4] text-white'
                            : 'text-[#003559] hover:bg-[#f5f5f5]',
                        ].join(' ')}
                      >
                        <span className={currentIndex === selectedIndex ? 'text-white' : 'text-gray-400'}>
                          {ENTITY_ICONS[result.entityType]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{result.title}</p>
                          <p className={`text-xs truncate ${currentIndex === selectedIndex ? 'text-white/70' : 'text-gray-400'}`}>
                            {result.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {query.trim() && !isSearching && results.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[#e0e0e0] text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#f5f5f5] border border-[#e0e0e0] rounded">&uarr;</kbd>
            <kbd className="px-1 py-0.5 bg-[#f5f5f5] border border-[#e0e0e0] rounded">&darr;</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#f5f5f5] border border-[#e0e0e0] rounded">Enter</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#f5f5f5] border border-[#e0e0e0] rounded">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CommandPalette;
