/**
 * Data Source Wizard
 * 7-step wizard for creating a new data source connection
 *
 * Steps:
 * 1. Source Type - Choose database, file, or API
 * 2. Connection - Configure credentials/upload
 * 3. Preview - View column stats and sample data
 * 4. Columns - Configure column names, types, include/exclude
 * 5. Cleaning - Set per-column cleaning rules
 * 6. Schedule - Configure sync frequency
 * 7. Review - Summary before creation
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  DataSourceType,
  DataSourceConfig,
  DatabaseCredentials,
  ColumnConfig,
  ColumnConfiguration,
  ScheduleConfiguration,
  PreviewResponse,
} from '@/types/dataImport';
import { DEFAULT_SCHEDULE_CONFIG, DEFAULT_COLUMN_CONFIG, isDatabaseType, isFileType, isOAuthType } from '@/types/dataImport';
import { analyzeColumns, generateDefaultColumnConfig } from '@/services/data-sources/cleaningService';
import { dataSourceService } from '@/services/data-sources/dataSourceService';
import { Card, CardHeader, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

import { SourceTypeSelector } from './SourceTypeSelector';
import { DatabaseConnector } from './DatabaseConnector';
import { FileUploader } from './FileUploader';
import { OAuthConnector } from './OAuthConnector';
import { DataPreviewPanel } from './DataPreviewPanel';
import { ColumnConfigurator } from './ColumnConfigurator';
import { CleaningRuleEditor } from './CleaningRuleEditor';
import { ScheduleConfigurator } from './ScheduleConfigurator';
import { ReviewStep } from './ReviewStep';

// =============================================================================
// Types
// =============================================================================

export interface DataSourceWizardProps {
  onComplete?: (dataSourceId: string) => void;
  onCancel?: () => void;
  className?: string;
}

type WizardStep =
  | 'source_type'
  | 'connection'
  | 'preview'
  | 'columns'
  | 'cleaning'
  | 'schedule'
  | 'review';

const STEPS: Array<{ id: WizardStep; title: string; description: string }> = [
  { id: 'source_type', title: 'Source Type', description: 'Choose data source' },
  { id: 'connection', title: 'Connection', description: 'Configure connection' },
  { id: 'preview', title: 'Preview', description: 'Review data' },
  { id: 'columns', title: 'Columns', description: 'Configure columns' },
  { id: 'cleaning', title: 'Cleaning', description: 'Data cleaning rules' },
  { id: 'schedule', title: 'Schedule', description: 'Sync schedule' },
  { id: 'review', title: 'Review', description: 'Confirm and create' },
];

interface WizardState {
  sourceType: DataSourceType | null;
  name: string;
  credentials: DatabaseCredentials;
  config: DataSourceConfig;
  file: File | null;
  preview: PreviewResponse | null;
  columns: ColumnConfig[];
  scheduleConfig: ScheduleConfiguration;
}

const INITIAL_STATE: WizardState = {
  sourceType: null,
  name: '',
  credentials: {},
  config: {},
  file: null,
  preview: null,
  columns: [],
  scheduleConfig: { ...DEFAULT_SCHEDULE_CONFIG },
};

// =============================================================================
// Icons
// =============================================================================

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function DataSourceWizard({ onComplete, onCancel, className = '' }: DataSourceWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('source_type');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Navigation
  const goToStep = useCallback((step: WizardStep) => {
    setError(null);
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      goToStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex, goToStep]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      goToStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex, goToStep]);

  // Step 1: Source type selection
  const handleSourceTypeSelect = useCallback((type: DataSourceType) => {
    setState((prev) => ({ ...prev, sourceType: type }));
  }, []);

  // Step 2: Connection
  const handleNameChange = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }));
  }, []);

  const handleCredentialsChange = useCallback((credentials: DatabaseCredentials) => {
    setState((prev) => ({ ...prev, credentials }));
  }, []);

  const handleConfigChange = useCallback((config: DataSourceConfig) => {
    setState((prev) => ({ ...prev, config }));
  }, []);

  const handleFileSelected = useCallback((file: File) => {
    setState((prev) => ({ ...prev, file }));

    // Parse CSV for preview (simulate reading file)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows: Record<string, unknown>[] = [];

      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] ?? null;
        });
        rows.push(row);
      }

      const columns = analyzeColumns(rows);
      const preview: PreviewResponse = { columns, rows, total_rows: lines.length - 1 };
      const defaultColumns = generateDefaultColumnConfig(columns);

      setState((prev) => ({ ...prev, preview, columns: defaultColumns }));
    };
    reader.readAsText(file);
  }, []);

  const handleUrlSet = useCallback((url: string) => {
    setState((prev) => ({
      ...prev,
      credentials: { ...prev.credentials, url } as DatabaseCredentials,
    }));
  }, []);

  // Step 4: Columns
  const handleColumnsChange = useCallback((columns: ColumnConfig[]) => {
    setState((prev) => ({ ...prev, columns }));
  }, []);

  // Step 6: Schedule
  const handleScheduleChange = useCallback((scheduleConfig: ScheduleConfiguration) => {
    setState((prev) => ({ ...prev, scheduleConfig }));
  }, []);

  // Create data source
  const handleCreate = useCallback(async () => {
    if (!state.sourceType || !state.name) {
      setError('Missing required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const columnConfig: ColumnConfiguration = {
        ...DEFAULT_COLUMN_CONFIG,
        columns: state.columns,
      };

      const created = await dataSourceService.create({
        name: state.name,
        type: state.sourceType,
        credentials: state.credentials,
        config: state.config,
        column_config: columnConfig,
        schedule_config: state.scheduleConfig,
        sync_schedule: state.scheduleConfig.frequency,
      });

      onComplete?.(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create data source');
    } finally {
      setLoading(false);
    }
  }, [state, onComplete]);

  // Validation
  const canProceed = useMemo((): boolean => {
    switch (currentStep) {
      case 'source_type':
        return !!state.sourceType;
      case 'connection':
        return !!state.name.trim();
      case 'preview':
        return true; // Preview is informational
      case 'columns':
        return state.columns.some((c) => c.included);
      case 'cleaning':
        return true; // Cleaning rules are optional
      case 'schedule':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, state]);

  // Step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => index <= currentStepIndex && goToStep(step.id)}
              disabled={index > currentStepIndex}
              className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                isCompleted
                  ? 'bg-[#2e7d32] text-white cursor-pointer'
                  : isCurrent
                    ? 'bg-[#0353a4] text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed',
              ].join(' ')}
              title={step.title}
            >
              {isCompleted ? <CheckIcon /> : index + 1}
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={[
                  'w-8 h-1 mx-1',
                  index < currentStepIndex ? 'bg-[#2e7d32]' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // Step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'source_type':
        return (
          <SourceTypeSelector
            selectedType={state.sourceType}
            onSelect={handleSourceTypeSelect}
          />
        );

      case 'connection':
        if (!state.sourceType) return null;

        if (isDatabaseType(state.sourceType)) {
          return (
            <DatabaseConnector
              sourceType={state.sourceType}
              name={state.name}
              credentials={state.credentials}
              config={state.config}
              onNameChange={handleNameChange}
              onCredentialsChange={handleCredentialsChange}
              onConfigChange={handleConfigChange}
            />
          );
        }

        if (isOAuthType(state.sourceType)) {
          return (
            <OAuthConnector
              sourceType={state.sourceType as 'google_analytics' | 'meta_pixel' | 'google_sheets'}
              name={state.name}
              onNameChange={handleNameChange}
            />
          );
        }

        if (isFileType(state.sourceType)) {
          return (
            <FileUploader
              sourceType={state.sourceType}
              name={state.name}
              onNameChange={handleNameChange}
              onFileSelected={handleFileSelected}
              onUrlSet={handleUrlSet}
              loading={loading}
              error={error ?? undefined}
            />
          );
        }

        return null;

      case 'preview':
        return (
          <DataPreviewPanel
            preview={state.preview}
            loading={loading}
          />
        );

      case 'columns':
        return (
          <ColumnConfigurator
            columns={state.columns}
            onChange={handleColumnsChange}
          />
        );

      case 'cleaning':
        return (
          <CleaningRuleEditor
            columns={state.columns}
            onChange={handleColumnsChange}
          />
        );

      case 'schedule':
        return (
          <ScheduleConfigurator
            config={state.scheduleConfig}
            onChange={handleScheduleChange}
          />
        );

      case 'review':
        return (
          <ReviewStep
            name={state.name}
            sourceType={state.sourceType!}
            config={state.config}
            credentials={state.credentials}
            columns={state.columns}
            scheduleConfig={state.scheduleConfig}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className} padding="none">
      <CardHeader
        actions={
          onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )
        }
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">New Data Source</span>
          {currentStep !== 'source_type' && (
            <Badge variant="secondary" size="sm">
              Step {currentStepIndex + 1} of {STEPS.length}: {STEPS[currentStepIndex].title}
            </Badge>
          )}
        </div>
      </CardHeader>

      <div className="p-6">
        {renderStepIndicator()}

        {error && currentStep !== 'connection' && (
          <div className="mb-6 p-4 bg-[#d32f2f]/10 border border-[#d32f2f]/20 rounded-lg text-[#d32f2f]">
            {error}
          </div>
        )}

        {renderStepContent()}
      </div>

      <CardFooter>
        {currentStepIndex > 0 && (
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={loading}
            leftIcon={<ArrowLeftIcon />}
          >
            Back
          </Button>
        )}
        <div className="flex-1" />
        {currentStep === 'review' ? (
          <Button onClick={handleCreate} loading={loading} disabled={!canProceed}>
            Create Data Source
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={!canProceed || loading}
            rightIcon={<ArrowRightIcon />}
          >
            Continue
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default DataSourceWizard;
