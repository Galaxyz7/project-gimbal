/**
 * Tabs Component
 * Accessible tab interface with role="tablist" and arrow key navigation
 */

import { useState, useCallback, useRef, type ReactNode, type KeyboardEvent } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function Tabs({ tabs, defaultTab, activeTab: controlledTab, onChange, className = '' }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id || '');
  const tabListRef = useRef<HTMLDivElement>(null);

  const activeTab = controlledTab ?? internalTab;

  const handleSelect = useCallback(
    (tabId: string) => {
      if (!controlledTab) {
        setInternalTab(tabId);
      }
      onChange?.(tabId);
    },
    [controlledTab, onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);
      let nextIndex = -1;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % enabledTabs.length;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = enabledTabs.length - 1;
      }

      if (nextIndex >= 0) {
        const nextTab = enabledTabs[nextIndex];
        handleSelect(nextTab.id);
        // Focus the next tab button
        const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        const targetButton = Array.from(buttons ?? []).find(
          (btn) => btn.getAttribute('aria-controls') === `tabpanel-${nextTab.id}`,
        );
        targetButton?.focus();
      }
    },
    [tabs, activeTab, handleSelect],
  );

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={className}>
      {/* Tab List */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation="horizontal"
        className="flex border-b border-[#e0e0e0]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-controls={`tabpanel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => handleSelect(tab.id)}
            onKeyDown={handleKeyDown}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#0353a4] text-[#0353a4]'
                : tab.disabled
                  ? 'border-transparent text-gray-300 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panel */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="pt-4"
      >
        {activeContent}
      </div>
    </div>
  );
}

export default Tabs;
