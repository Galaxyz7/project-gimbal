# Project Gimbal - Development Plan

Internal company platform for analytics dashboards and marketing campaign management.

## Current Status: ~85% Complete

**Completed:**
- Authentication with PKCE, rate limiting, audit logging
- Core components (ErrorBoundary, ProtectedRoute, Toast, Skeleton)
- Common UI components (Button, Input, Select, Card, Modal, Badge, etc.)
- Layout components (AppLayout, Header, Sidebar)
- Dashboard components (MetricCard, LineChart, BarChart, DonutChart, DataTable, DateRangePicker)
- DashboardPage connected to real CRM data with trend calculations
- **CRM Module:**
  - Database: sites, members, membership_levels, transactions, visits, consent, automation
  - Components: SiteList, MemberList, MemberDetail, MemberForm
  - Services: siteService, memberService, memberImportService
  - Types: Comprehensive member.ts definitions
- **Campaign Management:**
  - Database: campaigns, templates, messages tables with RLS
  - 11 UI components (CampaignList, CampaignForm, CampaignDetail, TemplateSelector, etc.)
  - Services: campaignService, templateService, messageService, smsService, emailService
  - Edge Functions: send-sms, send-email, process-campaign, handle-webhook
  - React Query hooks for all CRUD operations
- **Admin Portal:** UserList, UserForm, SettingsForm, profileService, appSettingsService
- **Audience Segments:** SegmentBuilder, SegmentList, segmentService
- **Analytics:** analyticsService, campaignReportService with trend calculations
- **Data Import Services:** cleaningService, importTableService, scheduleService, dataSourceService
- **State Management:** Zustand stores (auth, ui, crm), React Query, centralized queryKeys
- **Testing:** 41 test files, ~78% statement coverage

**In Progress:**
- Data import sync execution (wizard configures but doesn't sync yet)
- UX overhaul (navigation, onboarding, campaign workflow improvements)

**See [phases.md](phases.md) for detailed implementation roadmap.**

---

## MVP Scope (6 Weeks)

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1-2 | Foundation + Dashboard | Components, state management, Recharts analytics |
| 3-4 | Data Import + Campaigns | Import wizard, campaign CRUD, templates |
| 5-6 | Messaging + Launch | Twilio SMS, SendGrid Email, user validation |

### MVP Features
1. **CRM Module** - Multi-site member management, LTV tracking, consent management
2. **Data Import** - CSV, PostgreSQL, GA4, Meta Pixel with scheduled syncs
3. **Campaign Management** - SMS + Email campaigns with templates
4. **Dashboard Analytics** - Metrics, charts, date filtering (connected to CRM data)
5. **Admin Portal** - User management, settings

---

## Technology Stack

**Frontend:** React 19 + TypeScript 5 (strict) + Vite 7 + Tailwind CSS 4
**State:** Zustand (global), React Query (server)
**Forms:** React Hook Form + Zod
**Charts:** Recharts
**Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
**Messaging:** Twilio (SMS), SendGrid (Email)
**Testing:** Vitest + React Testing Library

**Post-MVP Tech (Phase A-C):**
- React Flow (visual builders)
- Social APIs (Facebook, Instagram, LinkedIn, X)
- AI APIs (OpenAI, Anthropic, Ollama - BYOK)

---

## Simplified Architecture

### Single-Tenant Deployment
- Single Supabase instance
- User-based data isolation via RLS
- Fixed company branding

### 3-Tier RBAC (MVP)
```
Admin > User > Viewer

Admin:  Full access, user management, settings
User:   Create/manage campaigns, view analytics
Viewer: Read-only access to reports
```

### Audit Retention
- **MVP:** 30 days (internal debugging)
- **Future (Phase D):** 7 years (SOC 2 compliance)

---

## Compliance (MVP)

| Standard | MVP Requirements |
|----------|------------------|
| **TCPA** | Prior SMS consent, opt-out honored, 8 AM - 9 PM quiet hours |
| **CAN-SPAM** | Physical address, clear unsubscribe, 10-day honor window |

**Deferred to Phase D:** Full GDPR (export/erasure), SOC 2 (7-year retention)

---

## Database Migrations (MVP)

### Completed Migrations

| # | Migration | Status | Description |
|---|-----------|--------|-------------|
| 1 | rate_limiting | Done | Login attempt tracking |
| 2 | audit_logs | Done | Audit logging (30-day retention) |
| 4 | sites_members | Done | Multi-site member management (CRM) |
| 5 | member_transactions_visits | Done | LTV calculation, visit tracking (CRM) |
| 6 | consent_automation | Done | TCPA/CAN-SPAM consent, automation triggers (CRM) |
| 7 | campaigns | Done | Campaign management, templates, messages |
| 8 | profiles_app_settings | Done | User profiles, app settings, API credentials |
| 9 | fix_rls_infinite_recursion | Done | RLS policy fix |
| 10 | audit_log_cleanup_cron | Done | Automated audit log cleanup |
| 11 | starter_templates | Done | System template flag + seed data |
| 12 | campaign_reporting | Done | Campaign report views and metrics |
| 13 | audience_segments | Done | Saved audience segments with rules |
| 14 | marketing_enhancements | Done | Campaign and marketing improvements |
| 15 | data_import_tables | Done | Data sources, import tables, sync logs |
| 16 | rate_limit_get_count | Done | Rate limit helper function |

### Remaining Migrations

| # | Migration | Description |
|---|-----------|-------------|
| 17 | data_source_destinations | Destination type, field mappings for unified import |

---

## Success Criteria (MVP)

- [x] SMS/Email campaigns can be created and sent
- [x] Template management (CRUD + variable rendering)
- [x] Dashboard shows CRM and campaign metrics
- [x] Admin can manage users and settings
- [x] TCPA/CAN-SPAM compliance enforced
- [ ] Data import from CSV with sync execution working
- [ ] GA4 and Meta Pixel sync operational
- [ ] 3-5 users validated the workflow

---

## Post-MVP Add-on Modules

| Phase | Feature | Timeline | Details |
|-------|---------|----------|---------|
| A | Visual Builders | 2 weeks | Campaign flows, segment builder, dashboard builder |
| B | Social Media | 2 weeks | Facebook, Instagram, LinkedIn, X integration |
| C | AI Assistant | 2 weeks | BYOK (OpenAI, Anthropic, Ollama) |
| D | Enterprise | As needed | Multi-instance, MFA, GDPR, SOC 2 |

See `build-docs/10-future/` for detailed documentation.

---

## Architecture Principles

### Data Isolation (MVP)
- RLS policies on all tables
- User-based access control
- No cross-user data exposure

### Provider Abstraction
- Swappable SMS/Email providers
- External data source connectors
- Future: AI provider interface (BYOK)

### Simplicity First
- Build only what's needed for MVP
- Validate with 3-5 users before expanding
- Add features incrementally post-MVP
