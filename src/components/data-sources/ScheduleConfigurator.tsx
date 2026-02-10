/**
 * Schedule Configurator
 * Step 6: Configure sync frequency, time, timezone, and retry settings
 */

import { useCallback } from 'react';
import type { ScheduleConfiguration, SyncScheduleFrequency } from '@/types/dataImport';
import { getFrequencyOptions, getCommonTimezones, getScheduleDescription, validateScheduleConfig } from '@/services/data-sources/scheduleService';
import { Input } from '../common/Input';
import { Select } from '../common/Select';

// =============================================================================
// Types
// =============================================================================

export interface ScheduleConfiguratorProps {
  config: ScheduleConfiguration;
  onChange: (config: ScheduleConfiguration) => void;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

// =============================================================================
// Component
// =============================================================================

export function ScheduleConfigurator({ config, onChange, className = '' }: ScheduleConfiguratorProps) {
  const frequencyOptions = getFrequencyOptions();
  const timezones = getCommonTimezones();
  const description = getScheduleDescription(config);
  const { errors } = validateScheduleConfig(config);

  const update = useCallback(
    (partial: Partial<ScheduleConfiguration>) => {
      onChange({ ...config, ...partial });
    },
    [config, onChange]
  );

  const showTime = config.frequency === 'daily' || config.frequency === 'weekly' || config.frequency === 'monthly';
  const showDayOfWeek = config.frequency === 'weekly';
  const showDayOfMonth = config.frequency === 'monthly';
  const showCron = config.frequency === 'cron';
  const showTimezone = showTime || showCron;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Frequency */}
      <div>
        <Select
          label="Sync Frequency"
          value={config.frequency}
          onChange={(e) => update({ frequency: e.target.value as SyncScheduleFrequency })}
          options={frequencyOptions.map((f) => ({ value: f.value, label: f.label }))}
        />
        <p className="text-xs text-gray-500 mt-1">
          {frequencyOptions.find((f) => f.value === config.frequency)?.description}
        </p>
      </div>

      {/* Time selection */}
      {showTime && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Time"
            type="time"
            value={config.time ?? '02:00'}
            onChange={(e) => update({ time: e.target.value })}
          />
          {showTimezone && (
            <Select
              label="Timezone"
              value={config.timezone ?? 'UTC'}
              onChange={(e) => update({ timezone: e.target.value })}
              options={timezones}
            />
          )}
        </div>
      )}

      {/* Day of week */}
      {showDayOfWeek && (
        <Select
          label="Day of Week"
          value={String(config.day_of_week ?? 0)}
          onChange={(e) => update({ day_of_week: parseInt(e.target.value) })}
          options={DAY_OPTIONS}
        />
      )}

      {/* Day of month */}
      {showDayOfMonth && (
        <Select
          label="Day of Month"
          value={String(config.day_of_month ?? 1)}
          onChange={(e) => update({ day_of_month: parseInt(e.target.value) })}
          options={DAY_OF_MONTH_OPTIONS}
        />
      )}

      {/* Cron expression */}
      {showCron && (
        <div>
          <Input
            label="Cron Expression"
            value={config.cron_expression ?? ''}
            onChange={(e) => update({ cron_expression: e.target.value })}
            placeholder="0 2 * * *"
          />
          <p className="text-xs text-gray-500 mt-1">
            Standard 5-field cron: minute hour day month weekday
          </p>
          {showTimezone && (
            <Select
              label="Timezone"
              value={config.timezone ?? 'UTC'}
              onChange={(e) => update({ timezone: e.target.value })}
              options={timezones}
              className="mt-3"
            />
          )}
        </div>
      )}

      {/* Schedule preview */}
      {config.frequency !== 'manual' && (
        <div className="p-3 rounded-lg bg-[#b9d6f2]/10 border border-[#b9d6f2]">
          <p className="text-sm text-[#003559]">
            <span className="font-medium">Schedule:</span> {description}
          </p>
        </div>
      )}

      {/* Retry configuration */}
      <div className="border-t border-[#e0e0e0] pt-4">
        <h3 className="text-sm font-medium text-[#003559] mb-3">Retry Settings</h3>

        <label className="flex items-center gap-2 text-sm text-[#003559] mb-3">
          <input
            type="checkbox"
            checked={config.retry_on_failure}
            onChange={(e) => update({ retry_on_failure: e.target.checked })}
            className="rounded border-[#e0e0e0]"
          />
          Retry on failure
        </label>

        {config.retry_on_failure && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Retries"
              type="number"
              value={config.max_retries}
              onChange={(e) => update({ max_retries: parseInt(e.target.value) || 0 })}
              min={0}
              max={10}
            />
            <Input
              label="Retry Delay (minutes)"
              type="number"
              value={config.retry_delay_minutes}
              onChange={(e) => update({ retry_delay_minutes: parseInt(e.target.value) || 1 })}
              min={1}
              max={1440}
            />
          </div>
        )}
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div role="alert" className="text-sm text-[#d32f2f] space-y-1">
          {errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}
    </div>
  );
}
