# Project Gimbal - Implementation Roadmap

Internal company platform for analytics dashboards and marketing campaign management.

## Current State (~65% Complete)

### Completed

**Authentication & Security:**
- Authentication MVP with PKCE, rate limiting, audit logging, remember me
- Database migrations: `001_rate_limiting.sql`, `002_audit_logs.sql`

**UI Components:**
- Core: ErrorBoundary, ProtectedRoute, Toast, Skeleton
- Common: Button, Input, Select, Checkbox, Textarea, Card, Modal, Badge, Spinner, Avatar, EmptyState, Alert
- Layout: AppLayout, Header, Sidebar (collapsible)
- Dashboard: MetricCard, LineChart, BarChart, DonutChart, DataTable, DateRangePicker

**Pages:**
- LoginPage (full-featured with rate limiting)
- DashboardPage (connected to real CRM data with trend calculations)
- CampaignsPage, CreateCampaignPage, CampaignDetailPage, EditCampaignPage
- MembersPage, DataSourcesPage
- AdminUsersPage, AdminSettingsPage

**State Management:**
- Zustand stores: authStore, uiStore, crmStore
- React Query: QueryProvider, centralized queryKeys
- React hooks: useAuth, useToast, useDebounce, useNavigation, useProfile

**CRM Module:**
- Database migrations: `004_sites_members.sql`, `005_member_transactions_visits.sql`, `006_consent_automation.sql`
- Types: `src/types/member.ts` (comprehensive type definitions)
- Components in `src/components/members/`:
  - SiteSelector, SiteList, SiteForm
  - MemberList, MemberDetail, MemberForm
  - ImportWizard with 8 step components
- Services in `src/services/members/`:
  - siteService, memberService, memberImportService, memberImportDataSourceService

**Campaign Management:**
- Database migration: `007_campaigns.sql` (campaigns, templates, messages tables)
- 11 UI components: CampaignList, CampaignCard, CampaignForm, CampaignPreview, CampaignStatus, CampaignMetrics, CampaignDetail, TemplateSelector, TemplateEditor, VariableInserter, CharacterCounter, SchedulePicker
- Services: campaignService, templateService, messageService, smsService, emailService
- React Query hooks: useCampaigns, useCampaign, useTemplates, etc.
- Edge Functions: send-sms, send-email, process-campaign, handle-webhook

**Admin Portal:**
- Database migration: `008_profiles_app_settings.sql`
- Components: UserList, UserForm, SettingsForm
- Services: profileService, settingsService

**Data Import Services:**
- cleaningService, importTableService, scheduleService

**Analytics:**
- analyticsService with trend calculations
- Dashboard connected to real CRM data

**Testing:**
- 26 test files, 520 tests, ~78% statement coverage
- Vitest + React Testing Library infrastructure

**Utilities:**
- validation, rateLimiter, auditLog, rememberMe, errors
- Comprehensive test coverage

---

# MVP (6 Weeks)

## Phase 1: Foundation & Dashboard (Week 1-2)

### 1.1 Common Components ✅ COMPLETE
Created in `src/components/common/`:
- [x] Button.tsx (primary, secondary, danger variants)
- [x] Input.tsx, Select.tsx, Checkbox.tsx, Textarea.tsx
- [x] Modal.tsx, Card.tsx, Badge.tsx
- [x] Spinner.tsx, Avatar.tsx, EmptyState.tsx, Alert.tsx

### 1.2 Layout Components ✅ COMPLETE
Created in `src/components/layout/`:
- [x] AppLayout.tsx (main shell with sidebar)
- [x] Header.tsx, Sidebar.tsx (collapsible)

### 1.3 State Management ✅ COMPLETE
Created in `src/stores/`:
- [x] authStore.ts (Zustand with persist)
- [x] uiStore.ts (sidebar, modals)
- [x] crmStore.ts (member/site state)

Created in `src/lib/`:
- [x] QueryProvider.tsx (React Query setup)
- [x] queryKeys.ts (centralized query keys for all domains)

### 1.4 Dashboard Components ✅ COMPLETE
Created in `src/components/dashboard/`:
- [x] MetricCard.tsx, DonutChart.tsx
- [x] LineChart.tsx, BarChart.tsx
- [x] DataTable.tsx, DateRangePicker.tsx

### 1.5 Dashboard Real Data ✅ COMPLETE
- [x] Created analyticsService with trend calculations
- [x] Connected DashboardPage to real member/transaction data
- [x] Replaced mock data with real queries

### Exit Criteria
- [x] All common components created
- [x] Layout responsive on mobile
- [x] Zustand stores working
- [x] React Query configured
- [x] Dashboard displays metrics
- [x] Charts render with data
- [x] Date range filtering works
- [x] Dashboard connected to real CRM data

---

## CRM Module ✅ COMPLETE (Added to Scope)

> **Note:** This module was built to support member management, LTV tracking, and TCPA/CAN-SPAM compliance. It provides the foundation for campaign targeting.

### Database Migrations (004-006)

**`004_sites_members.sql`** - Multi-site member management:
- `sites` - Hierarchical locations (company → region → site)
- `membership_levels` - Per-site custom tiers with benefits
- `members` - Full CRM records with LTV, CAC, tags, custom fields
- RLS policies for user-based data isolation

**`005_member_transactions_visits.sql`** - Engagement tracking:
- `member_transactions` - Purchase history for LTV calculation
- `member_visits` - Check-in/visit tracking
- Automatic LTV calculation via triggers

**`006_consent_automation.sql`** - Compliance & automation:
- `member_consent` - TCPA/CAN-SPAM consent tracking per member
- `promo_codes` - Attribution and CAC tracking
- `automation_triggers` - Time-based and event-based automations
- `automation_executions` - Execution history
- Helper functions: `can_send_sms()`, `can_send_email()`, `record_sms_opt_out()`

### Components (in `src/components/members/`)
- [x] SiteSelector, SiteList, SiteForm
- [x] MemberList, MemberDetail, MemberForm
- [x] ImportWizard with step components:
  - SourceSelection, DataPreview, ColumnMapping
  - DuplicateHandling, ScheduleConfig, SiteAssignment
  - CleaningRulesStep, CleaningPreview

### Services (in `src/services/members/`)
- [x] siteService.ts - Site CRUD operations
- [x] memberService.ts - Member CRUD with search
- [x] memberImportService.ts - Import processing
- [x] memberImportDataSourceService.ts - Data source connections

### Types
- [x] `src/types/member.ts` - Comprehensive type definitions for all CRM entities

---

## Phase 2: Data Import & Campaigns (Week 3-4)

### 2.1 Data Import Module

> **Note:** Migration `004_data_sources` was replaced by CRM migrations. Data import UI still needed.

**Database Migration: `007_data_sources.sql`** (future - for external sources)
```sql
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('google_analytics', 'meta_pixel', 'postgres', 'mysql', 'csv_upload', 'csv_url')),
    credentials JSONB, -- Encrypted
    config JSONB DEFAULT '{}',
    column_config JSONB DEFAULT '{}',
    schedule_config JSONB DEFAULT '{}',
    sync_schedule VARCHAR(50) DEFAULT 'manual',
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'idle',
    table_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE import_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL UNIQUE,
    column_definitions JSONB NOT NULL,
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(50),
    records_imported INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    error_message TEXT
);

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own data sources" ON data_sources FOR ALL USING (auth.uid() = user_id);
```

**Components** in `src/components/data-sources/`:
- DataSourceList.tsx, DataSourceCard.tsx
- DataSourceWizard.tsx (7-step flow)
- DataPreviewModal.tsx, ColumnConfigurator.tsx
- CleaningRuleEditor.tsx, ScheduleConfigurator.tsx
- CsvUploader.tsx, DatabaseConnector.tsx
- SyncHistory.tsx

### 2.2 Campaign Management ✅ COMPLETE

**Database Migration: `007_campaigns.sql`** (campaigns, templates, messages, metrics)

**Components** in `src/components/campaigns/`:
- [x] CampaignList, CampaignCard, CampaignForm, CampaignPreview
- [x] CampaignStatus, CampaignMetrics, CampaignDetail
- [x] TemplateSelector, TemplateEditor, VariableInserter
- [x] CharacterCounter, SchedulePicker

**Services** in `src/services/campaigns/`:
- [x] campaignService, templateService, messageService
- [x] smsService (TCPA compliance), emailService (CAN-SPAM)
- [x] React Query hooks for all CRUD operations

**Pages:**
- [x] CampaignsPage, CreateCampaignPage, EditCampaignPage
- [x] CampaignDetailPage

### 2.3 Starter Template Library ⏳ IN PROGRESS

**Database Migration: `011_starter_templates.sql`**
- Add `is_system` flag to campaign_templates
- Seed 8-10 pre-built templates (SMS + Email)
- CAN-SPAM compliant email templates with `{{unsubscribeUrl}}`
- SMS templates under 160 characters

**Components:**
- [ ] TemplateLibrary.tsx (card grid with type badges, preview, "Use Template")
- [ ] TemplateSelector.tsx enhancement (grouped "Starter" / "My Templates")
- [ ] Route: `/campaigns/templates`

### Exit Criteria
- [ ] Connect CSV upload working
- [ ] Connect PostgreSQL database
- [ ] Data preview shows top 10 rows
- [ ] Column configuration (rename, type, exclude)
- [ ] Cleaning rules apply
- [ ] Schedule sync working
- [x] Create SMS/Email campaigns
- [x] Template management
- [x] Campaign scheduling
- [x] Character counter for SMS
- [ ] Starter template library available

---

## Phase 3: Messaging & Launch (Week 5-6)

### 3.1 Messaging Integration ✅ COMPLETE

**Edge Functions** in `supabase/functions/`:
- [x] send-sms/index.ts (Twilio with TCPA compliance)
- [x] send-email/index.ts (SendGrid with CAN-SPAM compliance)
- [x] handle-webhook/index.ts (delivery status webhooks)
- [x] process-campaign/index.ts (full send pipeline with rate limiting)

**Services:**
- [x] smsService.ts (TCPA consent check, quiet hours)
- [x] emailService.ts (CAN-SPAM compliance)
- [x] messageService.ts (message CRUD and status tracking)

### 3.2 Admin Portal ✅ COMPLETE

**Database Migration: `008_profiles_app_settings.sql`**
- [x] profiles table with role-based access
- [x] app_settings table for messaging credentials

**Components** in `src/components/admin/`:
- [x] UserList.tsx, UserForm.tsx
- [x] SettingsForm.tsx

**Pages:**
- [x] AdminUsersPage, AdminSettingsPage

### 3.3 Campaign Reporting Enhancements (Launch Polish)

> Planned for Phase 3 launch polish. Existing CampaignMetrics shows basic counts; this adds time-series, funnels, and export.

- [ ] campaignReportService.ts (timeline, funnel, top engaged, error summary)
- [ ] CampaignReportDashboard.tsx (reuses existing chart components)
- [ ] "Report" tab in CampaignDetail (for sent/sending campaigns)
- [ ] CSV export for message data

### 3.4 User Testing & Polish
- Test with 3-5 real users
- Fix bugs and UX issues
- Performance optimization
- Error handling improvements

### Compliance Checkpoint
- [x] TCPA: Prior consent before SMS (enforced in smsService + DB)
- [x] TCPA: STOP opt-out honored (handle-webhook + record_sms_opt_out())
- [x] TCPA: 8 AM - 9 PM recipient timezone (enforced in smsService)
- [x] CAN-SPAM: Physical address in emails (required in emailService)
- [x] CAN-SPAM: Clear unsubscribe ({{unsubscribeUrl}} variable)

### Exit Criteria
- [x] Send SMS via Twilio
- [x] Send Email via SendGrid
- [x] Webhook processing for delivery status
- [x] Message tracking in UI
- [x] Admin can manage users (3-tier RBAC)
- [x] Admin can configure settings
- [ ] Campaign reporting dashboard
- [ ] 3-5 users validated workflow
- [ ] No critical bugs

---

# Post-MVP Add-on Phases

> **Note**: Implement these only after MVP is complete and validated with users.

## Phase A: Visual Builders & Advanced Marketing (2 weeks)

### Dependencies
```bash
npm install reactflow @reactflow/node-toolbar @reactflow/minimap @reactflow/controls
```

### A.1 Visual Builders

**Database Migration: `012_visual_builders.sql`**
- campaign_flows (React Flow nodes/edges)
- flow_executions (execution tracking)
- custom_dashboards (widget layouts)

**Components:**
- Campaign Flow Builder (trigger → condition → action nodes)
- Dashboard Builder (drag-and-drop widgets)

See `build-docs/10-future/visual-builders.md` for details.

### A.2 Audience Segmentation UI

> Campaign targeting already works via CampaignForm (membership levels, statuses, tags) and `get_campaign_recipients()`. This adds reusable saved segments with a visual builder.

**Database Migration: `013_audience_segments.sql`**
- `audience_segments` table (rules JSONB, estimated_size, is_dynamic)
- `segment_id` column on campaigns table
- RPC: `estimate_segment_size(p_rules JSONB)`

**Components** in `src/components/segments/`:
- [ ] SegmentBuilder.tsx (AND/OR rule group builder)
- [ ] RuleGroup.tsx, RuleCondition.tsx
- [ ] SegmentPreview.tsx (real-time member count)
- [ ] SegmentSelector.tsx (for CampaignForm)

**Service:** segmentService.ts (CRUD + size estimation)
**Page:** `/segments`

### A.3 A/B Testing

> Subject line A/B testing with automatic winner determination. Depends on campaign reporting (Phase 3.3) and segmentation (Phase A.2).

**Database Migration: `014_ab_testing.sql`**
- `is_ab_test`, `ab_test_config`, `parent_campaign_id`, `variant_label` on campaigns
- `ab_tests` table (test config, winner tracking)

**Components:**
- [ ] ABTestSetup.tsx (variant B subject, test %, winner metric)
- [ ] ABTestResults.tsx (side-by-side comparison)
- [ ] ABTestProgress.tsx (phase indicator)

**Edge Function:** evaluate-ab-test/index.ts (auto winner determination)
**Service:** abTestService.ts

---

## Phase B: Social Media (2 weeks)

### Dependencies
```bash
npm install oauth4webapi
```

### Database Migration: `009_social_media.sql`
- social_accounts (OAuth tokens)
- social_posts (scheduled/published)
- social_engagement (metrics)

### Supported Platforms
- Facebook Pages
- Instagram Business
- LinkedIn Company Pages
- X/Twitter

See `build-docs/10-future/social-media-integration.md` for details.

---

## Phase C: AI Assistant (2 weeks)

### Dependencies
```bash
npm install openai @anthropic-ai/sdk
```

### Database Migration: `010_ai_assistant.sql`
- ai_providers (BYOK configuration)
- ai_conversations (threads)
- ai_messages (chat history)
- ai_token_usage (tracking)
- ai_suggestions (actionable outputs)
- ai_usage_limits (role-based)

### Supported Providers (BYOK)
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3)
- Ollama (self-hosted)
- Azure OpenAI
- Custom OpenAI-compatible

See `build-docs/10-future/ai-assistant.md` for details.

---

## Phase D: Enterprise Features (as needed)

### Features
- Multi-instance white-label architecture
- Full GDPR compliance (export, erasure, portability)
- SOC 2 controls (7-year audit retention)
- MFA for all users
- 6-tier RBAC (Owner > Admin > Manager > Support > User > Viewer)
- Instance provisioning scripts

See `build-docs/10-future/` for detailed documentation:
- advanced-compliance.md
- multi-instance-strategy.md

---

## Migration Summary

### MVP Migrations - Completed

| # | Migration | Status | Description |
|---|-----------|--------|-------------|
| 1 | rate_limiting | ✅ Done | Login attempt tracking |
| 2 | audit_logs | ✅ Done | Audit logging (30-day retention) |
| 4 | sites_members | ✅ Done | CRM: Multi-site member management |
| 5 | member_transactions_visits | ✅ Done | CRM: LTV calculation, visit tracking |
| 6 | consent_automation | ✅ Done | CRM: TCPA/CAN-SPAM consent, automation |
| 7 | campaigns | ✅ Done | Campaign management, templates, messages |
| 8 | profiles_app_settings | ✅ Done | User profiles, app settings, API credentials |
| 9 | fix_rls_infinite_recursion | ✅ Done | RLS policy fix |
| 10 | audit_log_cleanup_cron | ✅ Done | Automated audit log cleanup |

### MVP Migrations - Remaining

| # | Migration | Sprint | Description |
|---|-----------|--------|-------------|
| 11 | starter_templates | 2 | System template flag + seed data |

### Post-MVP Migrations

| # | Migration | Phase | Description |
|---|-----------|-------|-------------|
| 12 | visual_builders | A | Flow and dashboard builders |
| 13 | audience_segments | A | Saved audience segments with rules |
| 14 | ab_testing | A | A/B test configuration and tracking |
| 15 | social_media | B | Social account connections |
| 16 | ai_assistant | C | AI providers, conversations, tokens |
| 17 | instance_config | D | White-label configuration |
| 18 | mfa | D | MFA recovery codes |
| 19 | gdpr | D | Full GDPR data requests |

---

## Success Criteria

### MVP

**CRM Module** ✅ Complete:
- [x] Multi-site member management
- [x] Membership levels with benefits
- [x] Member import with cleaning rules
- [x] LTV and transaction tracking
- [x] Visit tracking
- [x] TCPA/CAN-SPAM consent management at database level
- [x] Automation trigger definitions

**Dashboard** ✅ Complete:
- [x] UI components complete (metrics, charts, tables)
- [x] Connected to real CRM data with analyticsService
- [x] Date range filtering with trend calculations

**Data Import** ⏳ Partial:
- [x] Import services (cleaning, scheduling)
- [ ] Data Sources UI components
- [ ] GA4 and Meta Pixel connectors

**Campaigns** ✅ Complete:
- [x] SMS/Email campaigns can be created and sent
- [x] Template management (CRUD + variable rendering)
- [x] Twilio/SendGrid integration (Edge Functions)
- [x] TCPA/CAN-SPAM compliance enforced
- [ ] Starter template library

**Admin Portal** ✅ Complete:
- [x] Admin can manage users (Admin/User/Viewer)
- [x] Admin can configure settings

**Validation:**
- [ ] 3-5 users validated the workflow
- [ ] No critical bugs

### Post-MVP
- [ ] Phase A: Visual builders operational
- [ ] Phase B: Social posting to 4 platforms
- [ ] Phase C: AI assistant with BYOK
- [ ] Phase D: Enterprise features as needed
