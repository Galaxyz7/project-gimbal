UI/UX Improvements Plan (Reviewer 4 Feedback)
Context
A UI/UX design professional reviewed the app and identified inconsistencies where existing common components (Tabs, Modal, Dropdown) go unused while ad-hoc implementations proliferate, a layout bug on the dashboard, fragile spacing, and a WCAG AA color contrast failure. All 5 top priorities can be addressed by leveraging components that already exist -- no new components needed.

1. Consolidate tab implementations onto common Tabs component
Why: Three pages implement tabs ad-hoc with varying (or zero) ARIA support. The common Tabs.tsx already has full accessibility (roles, aria-controls, keyboard nav, focus management).

Files to modify:

CampaignDetail.tsx -- Remove Tab type alias and activeTab state. Build a tabs array with {id, label, content} entries for overview/messages/content/report (report conditionally spread). Replace the <nav> tab bar + conditional content blocks with <Tabs tabs={tabItems} defaultTab="overview" />.

MemberDetail.tsx -- Remove activeTab state. Build tabs array with dynamic labels (e.g. `Transactions (${transactions.length})`). Replace tab bar + content blocks with <Tabs>.

AdminSettingsPage.tsx -- Remove TabId type and activeTab state. Replace the two <Button> toggles with <Tabs tabs={[{id:'settings', label:'Application Settings', content: <SettingsForm/>}, {id:'audit', label:'Audit Log', content: <AuditLogViewer/>}]} />.

Note: The Tabs component has pt-4 on the tab panel -- verify no double-spacing with content that has its own top padding.

2. Replace hand-rolled modals with common Modal component
Why: Two modals in CampaignDetail use bare <div className="fixed inset-0"> without portal, focus trap, scroll lock, or ARIA. The common Modal.tsx already provides all of this.

File: CampaignDetail.tsx

ScheduleModal (~lines 363-418): Wrap content in <Modal isOpen onClose title="Schedule Campaign" size="sm" footer={...}>. Use form id attribute to connect the footer submit button to the form body.
SendTestModal (~lines 420-531): Same approach with <Modal title="Send Test Message" size="sm">.
Add import { Modal } from '../common/Modal' at top.
3. Fix CampaignSummaryCard layout on Dashboard
Why: CampaignSummaryCard is the only child in a grid-cols-3 container, taking 1/3 width with 2/3 empty space. This looks like a bug.

File: DashboardPage.tsx (~lines 349-352)

Remove the wrapping <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"> and render <CampaignSummaryCard /> directly as a full-width element in the page flow.
4. Dashboard spacing system
Why: Every section uses individual mb-6 which is fragile. A parent space-y-6 is more resilient and self-correcting.

File: DashboardPage.tsx

Wrap all dashboard content sections in <div className="space-y-6">.
Remove mb-6 from: metric cards grid, <QuickActions className="mb-6">, CampaignSummaryCard, charts grid, bar chart wrapper.
Remove the now-empty bar chart wrapper <div> if it served only to hold mb-6.
5. Fix warning color contrast (WCAG AA)
Why: Warning color #ed6c02 on white has 3.01:1 contrast ratio, failing WCAG AA (requires 4.5:1 for normal text).

Fix: Replace #ed6c02 with #b45309 (~5.9:1 contrast on white, passes AA). Global find-and-replace across src/ files:

File	Context
Badge.tsx	variantStyles.warning, dotColors.warning
Alert.tsx	Warning variant container + icon color
Avatar.tsx	away status color
MemberDetail.tsx	StatCard warning color
CampaignMetrics.tsx	Warning text
CampaignReportDashboard.tsx	Warning text + chart color
SmsCharacterCounter.tsx	Warning text
CampaignForm.tsx	Warning bg/border/text
DonutChart.tsx	Chart color
MapAndCleanStep.tsx	Warning text
CLAUDE.md	Design token docs
No change needed for #0353a4 on bg-[#b9d6f2]/30 -- the 30% opacity results in ~7.5:1 contrast, well above AA.

6. Header user menu keyboard accessibility (lower priority)
Why: User menu uses CSS group-hover -- not keyboard or touch accessible.

File: Header.tsx (~lines 75-173)

Rewrite UserMenu to use the existing Dropdown component (already imported in this file for CreateButton). Build a DropdownItem[] array with Settings (admin only), divider, and Sign out items.
7. DataSourceCard action button discoverability (lower priority)
Why: Sync and delete are tiny icon-only buttons (w-4 h-4, p-1) that require hover to identify.

File: DataSourceCard.tsx (~lines 80-109)

Increase icon size to w-5 h-5 and padding to p-1.5.
Add visible text labels: <span className="text-xs">Sync</span> and <span className="text-xs">Delete</span>.
Add flex items-center gap-1 to button classes.
8. MemberDetail overview visual hierarchy (lower priority)
Why: All 6 overview cards have identical styling -- no differentiation between primary (Contact, Membership) and secondary info.

File: MemberDetail.tsx

Add className="border-[#b9d6f2]" to the Contact Information and Membership <Card> components. Uses existing design token for subtle accent border. Secondary cards keep default border-[#e0e0e0].
9. Loading skeleton consistency (lower priority)
Why: MemberList uses inline animate-pulse divs while other components use the <Skeleton> component.

File: MemberList.tsx (~lines 450-463)

Replace inline skeleton with <Skeleton> component using variant="circular" for avatars and default rectangular for text lines.
Implementation Order
Step	Priority	Files	Risk
1	5 - Warning color	~11 files (find-replace)	Low -- pure visual
2	3+4 - Dashboard layout + spacing	DashboardPage.tsx	Low -- structural only
3	2 - Modal consolidation	CampaignDetail.tsx	Medium -- verify form/footer pattern
4	1 - Tabs consolidation	CampaignDetail.tsx, MemberDetail.tsx, AdminSettingsPage.tsx	Medium -- verify pt-4 spacing
5	6-9 - Lower priority items	Header.tsx, DataSourceCard.tsx, MemberDetail.tsx, MemberList.tsx	Low
Verification
npm run build -- ensure no TypeScript errors
npm run lint -- ensure no ESLint errors
npm run test -- ensure existing tests pass (tab/modal tests may need updates)
Manual check: Navigate to Dashboard, Campaign Detail, Member Detail, Admin Settings -- verify tabs work with keyboard (Arrow keys, Home/End), modals trap focus and close on Escape, dashboard spacing is uniform, warning colors are visible



=================================================================================================================

UX Improvements Plan - Reviewer 1 Feedback
Context
A daily operator reviewed the app and identified 10 pain points. The top 3 "just fix this" requests are: inline editing in list views, total record counts in pagination, and a global search/command palette (Ctrl+K). This plan addresses all feedback items in priority order across 4 batches.

Batch 1: Total Record Counts in Pagination
Problem: MemberList shows "Showing 1-25+", CampaignList shows "Page 1" - no total counts anywhere.

Approach: Add count queries to services, standardize pagination display across both lists.

1a. Campaign count (simpler - already uses React Query)
Modify campaignService.ts:

Update getCampaigns() to use .select('*', { count: 'exact' }) (Supabase already supports this pattern - used in estimateRecipientCount())
Return { campaigns: Campaign[], totalCount: number } instead of Campaign[]
Modify useCampaigns.ts:

Update useCampaigns() return type to include totalCount
Modify CampaignList.tsx:

Replace Page {page + 1} (line 368) with Showing {start}-{end} of {totalCount}
Add page indicator: Page {page + 1} of {totalPages}
1b. Member count (uses RPC)
Modify memberService.ts:

Add searchMembersWithCount() that runs a parallel count query using the same filters
Use supabase.from('members').select('*', { count: 'exact', head: true }) with matching filters for the count
Return { members: MemberSearchResult[], totalCount: number }
Modify MemberList.tsx:

Call searchMembersWithCount() instead of searchMembers()
Store totalCount in state
Replace {hasMore && '+'} (line 497) with of {totalCount}
Add page indicator between Previous/Next buttons
Batch 2: Error Retry Fix + MemberList React Query Migration
Problem: MemberList error retry calls window.location.reload() (line 469), losing all filter state.

Approach: Migrate MemberList data fetching from manual useEffect to React Query (matching the CampaignList pattern), which gives us refetch() for free.

New file: src/hooks/useSearchMembers.ts
Create useSearchMembers(params: MemberSearchParams) React Query hook
Calls searchMembersWithCount() from Batch 1
Returns { data, totalCount, isLoading, error, refetch }
Uses memberKeys.list(params) query key
Modify MemberList.tsx
Replace manual useState + useEffect fetch pattern with useSearchMembers() hook
Replace window.location.reload() with refetch() from the hook
Remove members, loading, error, hasMore state variables (React Query manages these)
Keep filter state (search, selectedSiteId, status, page) as local state that feeds into the hook params
Batch 3: Global Search / Command Palette (Ctrl+K)
Problem: No way to search across entities from anywhere. Everything requires sidebar navigation.

New file: src/services/search/globalSearchService.ts
searchAll(query: string): Promise<SearchResults>
Runs parallel searches: members (via searchMembers), campaigns (via getCampaigns), segments (via getSegments filtered client-side), data sources (via getDataSources filtered client-side)
Limit 5 results per entity type
Returns grouped results with entityType, id, title, subtitle, url
New file: src/components/common/CommandPalette.tsx
Modal overlay with search input at top (auto-focused)
Debounced search (300ms)
Results grouped by type with section headers (Members, Campaigns, Segments, Data Sources)
Each result shows icon + title + subtitle
Quick actions section when input is empty: "Create Campaign", "Add Member", "Import Data"
Keyboard navigation: Arrow Up/Down to move, Enter to navigate, Escape to close
Built on existing Modal + Input components
Uses React Router useNavigate() for navigation on selection
New file: src/hooks/useCommandPalette.ts
Global keyboard listener for Ctrl+K / Cmd+K
Returns { isOpen, open, close }
Prevents default browser behavior on Ctrl+K
Modify AppLayout.tsx
Render <CommandPalette /> at root level
Wire up useCommandPalette() hook
Modify Header.tsx
Add search button with Ctrl+K hint badge to open palette from header
Add to queryKeys.ts
Add searchKeys for global search queries
Batch 4: Inline Editing
Problem: Editing any field requires navigating to a full-page edit form (4+ clicks for a 1-field change).

Approach: Click-to-edit pattern for safe scalar fields. Click the cell text to enter edit mode, press Enter/blur to save, Escape to cancel. Complex fields (addresses, consent, etc.) still use the full form.

Inline-editable fields
Members: firstName, lastName, phone, membershipStatus
Campaigns: name (draft campaigns only - sent campaigns shouldn't be editable inline)
New file: src/components/common/InlineEdit.tsx
Props: value, onSave(newValue), type: 'text' | 'select', options? (for select), disabled?
Display mode: renders value as text with subtle hover underline/pencil icon
Edit mode: renders Input or Select component inline
Save on Enter or blur, cancel on Escape
Shows loading spinner during save, error state via toast on failure
Uses e.stopPropagation() to prevent row click navigation
New file: src/hooks/useInlineEdit.ts
Manages isEditing, editValue, isSaving, error state
startEdit(), save(), cancel() actions
Keyboard handler for Enter/Escape
Modify MemberList.tsx
Wrap name, phone, status cells in MemberRow with <InlineEdit>
On save: call updateMember(id, { [field]: value }) via a mutation hook
Optimistic update: use React Query's onMutate to update cache immediately, rollback onError
New hook in useSearchMembers.ts
Add useUpdateMemberField() mutation hook
Calls memberService.updateMember(id, partialInput)
Invalidates memberKeys.list() on success
Modify CampaignList.tsx
Wrap campaign name cell with <InlineEdit> (only for draft campaigns)
On save: use existing useUpdateCampaign() mutation hook
Batch 5: Table Column Density
Problem: MemberList has 10 columns and horizontal-scrolls on normal monitors.

New file: src/hooks/useColumnVisibility.ts
Manages which columns are visible
Persists to localStorage under gimbal-member-columns
Default visible: Checkbox, Member, Status, Phone, LTV, Last Visit (6 columns)
Optional (hidden by default): Engagement, Level, Visits, Site
New file: src/components/common/ColumnToggle.tsx
Dropdown button with checkbox list of column names
"Reset to defaults" option at bottom
Placed next to existing filter controls
Modify MemberList.tsx
Add <ColumnToggle> in the filter bar area
Conditionally render <th> and <td> cells based on visibleColumns
Define column config array: { key, label, defaultVisible, renderHeader, renderCell }
Batch 6: Campaign Workflow Improvements
6a. Duplicate + Edit (navigate to edit page after duplicate)
Modify CampaignList.tsx:

Change duplicate handler (line 348) from duplicateMutation.mutate(id) to duplicateMutation.mutateAsync(id)
On success, navigate(/campaigns/${newCampaign.id}) to open the duplicated campaign
The detail page already has an Edit button, so the user is one click from editing
6b. Created/Updated timestamps on campaigns
Modify CampaignList.tsx:

The "Date" column already exists - enhance it to show created_at with a tooltip showing updated_at
Use existing Tooltip component: hover shows "Last updated: {date}"
Campaign data already includes created_at and updated_at from Supabase
Batch 7: Segment URL State
Problem: Segment editing uses local state - refresh loses work, can't share links.

Modify routing in App.tsx
Add routes: /segments/:id for viewing, /segments/new for creating
Current /segments stays as the list view
New file: src/pages/SegmentDetailPage.tsx
Route component for /segments/:id
Loads segment by ID from URL params
Renders segment builder with loaded data
Uses useBeforeUnload to warn about unsaved changes
Modify SegmentList.tsx
Change onEdit(segment) to navigate to /segments/${segment.id}
Change onCreate() to navigate to /segments/new
Batch 8: Keyboard Shortcuts
New file: src/hooks/useHotkey.ts
Simple hook: useHotkey(key: string, callback: () => void, options?: { enabled?: boolean })
Handles Ctrl/Cmd modifier detection
Skips when focus is in input/textarea/contentEditable
Apply shortcuts in page components
Global (in AppLayout): Ctrl+K = command palette (already handled in Batch 3)
MembersPage: / = focus search, n = navigate to create member
CampaignsPage: / = focus search, n = navigate to create campaign
Files Summary
New files (8)
File	Batch	Purpose
src/hooks/useSearchMembers.ts	2	React Query hook for member search + count
src/services/search/globalSearchService.ts	3	Cross-entity search
src/components/common/CommandPalette.tsx	3	Global search modal
src/hooks/useCommandPalette.ts	3	Ctrl+K keyboard handler
src/components/common/InlineEdit.tsx	4	Generic inline edit cell
src/hooks/useInlineEdit.ts	4	Inline edit state management
src/components/common/ColumnToggle.tsx	5	Column visibility dropdown
src/hooks/useHotkey.ts	8	Keyboard shortcut hook
Modified files (10)
File	Batches	Changes
src/services/campaigns/campaignService.ts	1	Add count to getCampaigns
src/services/campaigns/useCampaigns.ts	1	Update return types
src/services/members/memberService.ts	1	Add searchMembersWithCount
src/components/campaigns/CampaignList.tsx	1, 4, 6	Counts, inline edit, duplicate+edit, timestamps
src/components/members/MemberList.tsx	1, 2, 4, 5	Counts, React Query, inline edit, column toggle
src/components/layout/AppLayout.tsx	3	Mount CommandPalette
src/components/layout/Header.tsx	3	Add Ctrl+K search button
src/lib/queryKeys.ts	2, 3	Add member + search query keys
src/components/segments/SegmentList.tsx	7	Navigate instead of callback
src/App.tsx	7	Add segment detail routes
Verification
After each batch, run:

npm run build - type-check + production build passes
npm run test - all existing tests pass
npm run lint - no new lint errors
Manual verification in browser for the specific batch
Batch-specific checks
Batch 1: Pagination shows "Showing 1-25 of N" on both lists
Batch 2: MemberList error state shows Retry button that preserves filters
Batch 3: Ctrl+K opens palette, search returns results, Enter navigates
Batch 4: Click a member name in the table, edit inline, saves without page navigation
Batch 5: Column toggle hides/shows columns, preference persists on refresh
Batch 6: Duplicate campaign navigates to the new campaign's detail page
Batch 7: /segments/:id loads segment, browser refresh preserves state
Batch 8: Press / to focus search, n to create new item



===============================================================================================


Plan: Marketing Reviewer Feedback Improvements
Context
A marketing professional reviewed the app and provided feedback. The platform has strong fundamentals (segmentation, compliance hints, template stats, campaign detail) but lacks campaign performance visibility on the dashboard, organizational tools for templates, and a calendar view for campaign scheduling. This plan addresses the reviewer's top 3 recommendations plus 2 additional high-value items.

Scope
Implementing (5 items):

Campaign performance dashboard section (Top 3 pick)
Campaign calendar view (Top 3 pick)
Template categories (Top 3 pick)
Member marketing engagement summary on overview tab
Segment overlap analysis
Deferring (2 items):

A/B testing - Major feature touching every layer (DB, Edge Functions, types, form, detail). Best suited for Phase A after MVP validation.
Brand color refresh - Colors are hardcoded as hex values across 50+ files (e.g., bg-[#0353a4]), not referenced via theme tokens. A palette change requires first refactoring all hex values to use Tailwind theme tokens, then changing the tokens. Recommend as a separate design-system task.
1. Campaign Performance Dashboard Section
Problem: Dashboard shows only CRM metrics. CampaignSummaryCard shows campaign names with minimal stats. Marketers must navigate to individual campaign detail pages to see performance.

Approach: Expand CampaignSummaryCard into a richer performance summary with rate metrics and visual indicators. Fix the layout so it spans the full grid width.

Files to modify
CampaignSummaryCard.tsx - Expand rows to show delivery rate, open rate, click rate as colored percentage badges. Add aggregate averages at top.
DashboardPage.tsx - Change the CampaignSummaryCard grid from lg:grid-cols-3 (1/3 width) to full-width, or span lg:col-span-3.
Implementation details
Campaign type already has totalSent, totalDelivered, totalOpened, totalClicked - no backend changes needed
Compute rates inline: deliveryRate = totalDelivered / totalSent * 100
Show delivery rate for SMS, open rate + click rate for email
Add a mini summary row at top: "Last 5 campaigns: avg 94% delivery, 23% open rate"
Handle zero-sent edge case (show "--" instead of NaN)
2. Campaign Calendar View
Problem: Campaigns are only shown in a table. No visual scheduling overview for coordinating marketing efforts.

Approach: Add a list/calendar view toggle on the Campaigns page. Build a custom monthly grid calendar (no new dependencies - consistent with the project's approach of using native Date APIs).

Files to create
CampaignCalendar.tsx - Monthly grid calendar showing campaigns on their scheduled/sent dates
CampaignCalendar.test.tsx
Files to modify
CampaignsPage.tsx - Add view toggle (list/calendar icons) in PageHeader actions area, conditionally render CampaignList or CampaignCalendar
campaign.ts - Add dateFrom?: string and dateTo?: string to CampaignSearchParams
campaignService.ts - Add .gte('scheduled_at', dateFrom).lte('scheduled_at', dateTo) filters to getCampaigns
Implementation details
CSS grid with 7 columns (Sun-Sat), rows for each week of the month
Campaigns placed on scheduledAt date (fall back to createdAt for drafts)
Color-coded by status: draft=gray, scheduled=blue, sending=amber, sent=green, failed=red
Click campaign to navigate to detail page
Month navigation arrows in header
Reuse existing CampaignTypeIcon and CampaignStatusBadge components
Calendar fetches campaigns for visible month using new date range params
3. Template Categories
Problem: Templates are only split into Starter/My Templates with search and type filter. No way to organize by purpose. Won't scale past 20-30 templates.

Approach: Add a category column to the templates table. Add category filter and grouped display to TemplateLibrary.

Files to create
018_template_categories.sql - Add category VARCHAR(50) to campaign_templates, update starter templates with categories, add index
Files to modify
campaign.ts - Add TemplateCategory type ('welcome' | 'promotional' | 'retention' | 'transactional' | 'newsletter' | 'event' | 'other'), add category to CampaignTemplate, CreateTemplateInput, UpdateTemplateInput. Add TEMPLATE_CATEGORY_LABELS constant.
TemplateLibrary.tsx - Add category filter dropdown alongside type filter. Group templates by category within Starter/My sections. Show category badge on cards.
campaignService.ts or template service - Add category to transform function, add category filter to getTemplates, include in create/update operations
useCampaigns.ts - Add category to useTemplates params
Categories
welcome, promotional, retention, transactional, newsletter, event, other

4. Member Marketing Engagement Summary
Problem: Campaign Activity is the 4th tab on MemberDetail. Marketers can't see engagement at a glance from the overview.

Approach: Add an "Engagement Summary" card to the Overview tab, computed from the already-loaded campaignActivity data.

Files to modify
MemberDetail.tsx - Add engagement summary card in the overview tab grid. Compute from existing campaignActivity state:
Total campaigns received
Emails: sent / opened / clicked counts
SMS: sent / delivered counts
Open rate, click rate
Last campaign date
Channel breakdown (SMS vs Email)
Implementation details
No backend changes - campaignActivity (MemberCampaignActivity[]) is already fetched on mount
Place card after Contact Information section in the overview grid
Use same StatCard sub-component pattern used elsewhere in MemberDetail
Show "--" for rates when no data exists
5. Segment Overlap Analysis
Problem: Marketers create segments but can't see how they overlap. Important for campaign planning to avoid audience fatigue.

Approach: Add a "Compare Segments" feature that shows member overlap between 2 selected segments.

Files to create
019_segment_overlap.sql - Database function get_segment_overlap(p_segment_id_a UUID, p_segment_id_b UUID) returning overlap count, a-only count, b-only count
SegmentOverlapDialog.tsx - Modal showing comparison results with visual bars
Files to modify
SegmentList.tsx - Add "Compare" button, checkbox-based segment selection (select 2 to compare)
Segment service - Add getSegmentOverlap(segmentIdA, segmentIdB) calling the RPC function
Segment hooks - Add useSegmentOverlap React Query hook
queryKeys.ts - Add overlap key
Implementation details
Simple horizontal bar visualization (not Venn diagram) showing: Segment A only, Overlap, Segment B only
The DB function evaluates both segment rule groups and intersects the member sets
Limit to comparing 2 segments at a time for simplicity
Implementation Order
Campaign performance dashboard - Smallest change, highest impact, no backend work
Member engagement summary - Small change, no backend work, leverages existing data
Template categories - Medium change, requires migration + type updates + UI
Campaign calendar - Medium-large, new component + service enhancement
Segment overlap - Medium, requires migration + new DB function + new dialog
Verification
After each item:

npm run build to verify TypeScript compiles
npm run test to verify existing tests pass
npm run lint to verify no lint errors
Manual browser testing of the modified pages
Write tests for new components (CampaignCalendar, SegmentOverlapDialog)


=============================================================================================



Salesperson Feedback: Implementation Plan
Context
A salesperson reviewed the app and identified pain points that make it a "contact database, not a CRM." Their top 3 requests are: (1) activity notes on members, (2) clickable phone/email links, and (3) a follow-ups dashboard widget. We'll also address their feedback about campaign list not showing audience info and the lack of a unified member timeline.

This plan does NOT cover deal/pipeline tracking or global search — those are out of scope for the current phase.

Phase A: Quick Wins (no DB changes)
A1. Click-to-call / click-to-email in MemberDetail
Modify: src/components/members/MemberDetail.tsx (lines 307-308)

Currently InfoRow renders email/phone as plain text. Since InfoRow already accepts React.ReactNode (line 89), wrap values in <a> tags:


<InfoRow label="Email" value={
  member.email ? <a href={`mailto:${member.email}`} className="text-[#0353a4] hover:underline">{member.email}</a> : null
} />
<InfoRow label="Phone" value={
  member.phone ? <a href={`tel:${member.phone}`} className="text-[#0353a4] hover:underline">{member.phone}</a> : null
} />
A2. Campaign list: show audience/segment column
Modify: src/components/campaigns/CampaignList.tsx

Import useSegments from @/services/segments
Build a segmentMap: Map<string, string> from segments data
Add "Audience" column header between Status and Date
In each row, display: segment name if segmentId set, "All Members" if targetAllMembers, or membership statuses otherwise
Update empty state colSpan
Modify: src/components/campaigns/CampaignDetail.tsx

Import segment hook to resolve campaign.segmentId to a name
Update the Target Audience display to show segment name when available
Phase B: Member Notes System (requires migration)
B1. Database migration
Create: supabase/migrations/018_member_notes.sql


CREATE TYPE note_type AS ENUM ('note', 'call', 'meeting', 'email_log', 'follow_up');

CREATE TABLE member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  note_type note_type NOT NULL DEFAULT 'note',
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;
-- RLS: users CRUD own notes (user_id = auth.uid())
-- Indexes: member_id, user_id, created_at DESC, note_type
-- updated_at trigger reusing existing update_updated_at_column()
B2. Types
Modify: src/types/member.ts — add:

NoteType = 'note' | 'call' | 'meeting' | 'email_log' | 'follow_up'
MemberNote interface (id, userId, memberId, noteType, content, isPinned, createdAt, updatedAt)
CreateNoteInput (memberId, noteType?, content, isPinned?)
UpdateNoteInput (content?, noteType?, isPinned?)
B3. Service
Create: src/services/members/memberNoteService.ts

Follow memberService.ts pattern (Supabase client, transform functions, error handling)
CRUD: getMemberNotes(memberId), createNote(input), updateNote(id, input), deleteNote(id)
Order by is_pinned DESC, created_at DESC (pinned first, then newest)
Audit logging on create/delete
B4. React Query hooks
Create: src/services/members/useMemberNotes.ts

useMemberNotes(memberId) — query hook
useCreateNote() — mutation, invalidates notes query on success
useUpdateNote() — mutation for pin/edit
useDeleteNote() — mutation
Follow useCampaigns.ts pattern
B5. Query keys
Modify: src/lib/queryKeys.ts — add to memberKeys:


notes: (memberId: string) => [...memberKeys.all, 'notes', memberId] as const,
B6. Exports
Modify: src/services/members/index.ts — export new service, hooks, and types

B7. Notes tab in MemberDetail
Modify: src/components/members/MemberDetail.tsx

Expand tab type to include 'notes'
Add tab to the tabs array after "Campaign Activity"
Fetch notes via useMemberNotes(memberId)
Notes tab UI:
Add-note form: Textarea + note type Select + Submit button
Chronological note list with type badges, content, timestamp, pin/delete actions
Empty state when no notes
Note type badges use existing Badge component with color mapping:
note → default, call → secondary, meeting → success, email_log → default, follow_up → warning
Phase C: Dashboard Follow-Ups Widget
C1. Analytics service method
Modify: src/services/analytics/analyticsService.ts

Add FollowUpMember interface (id, name, email, phone, lifetimeValue, lastVisitAt, daysSinceVisit, engagement status, siteName)
Add getFollowUpMembers(limit, siteId?) method:
Query active members where last_visit_at < 30 days ago
Join sites for name
Order by lifetime_value DESC
Compute daysSinceVisit and classify as at_risk (31-90 days) or inactive (90+)
C2. Hook
Modify: src/services/analytics/useAnalytics.ts — add useFollowUpMembers(limit, siteId?) hook

Modify: src/services/analytics/index.ts — export new hook + type

C3. Widget component
Create: src/components/dashboard/FollowUpWidget.tsx

Follow CampaignSummaryCard.tsx pattern (Card wrapper, loading skeleton, list)
Title: "Follow-Ups" with "View All" link to /audience
Each row: member name (clickable → member detail), LTV badge, engagement badge (warning/danger), days since visit, click-to-call/email icons
Empty state: "No follow-ups today"
C4. Dashboard integration
Modify: src/pages/DashboardPage.tsx

Import and add FollowUpWidget alongside CampaignSummaryCard in the grid layout
Modify: src/components/dashboard/index.ts — export FollowUpWidget

Phase D: Unified Member Timeline Tab
D1. Timeline types
Modify: src/types/member.ts — add:

TimelineEventType = 'note' | 'visit' | 'transaction' | 'campaign'
TimelineEvent interface (id, type, timestamp, title, description, metadata)
D2. Timeline builder utility
Create: src/utils/memberTimeline.ts

Pure function buildMemberTimeline(notes, visits, transactions, campaigns) → TimelineEvent[]
Maps each data type to unified TimelineEvent format
Sorts by timestamp descending (newest first)
D3. Timeline tab in MemberDetail
Modify: src/components/members/MemberDetail.tsx

Add 'timeline' tab (placed after Overview, before Transactions)
Compute events via useMemo + buildMemberTimeline from already-fetched data
Render vertical timeline with colored dots per event type:
note: #0353a4 (primary), visit: #2e7d32 (success), transaction: #006daa (secondary), campaign: #ed6c02 (warning)
Each event shows: type badge, title, description, formatted timestamp
Tests
New test files
File	Tests
src/services/members/__tests__/memberNoteService.test.ts	CRUD operations, transform, error handling
src/services/members/__tests__/useMemberNotes.test.tsx	Query hooks, mutation invalidation
src/utils/__tests__/memberTimeline.test.ts	Sort order, type mapping, empty inputs, edge cases
src/services/analytics/__tests__/followUpMembers.test.ts	Query, engagement classification, LTV sorting
Existing tests
No existing tests should break — all changes are additive (new tabs, new columns, new widgets).

File Summary
Phase	File	Action
A	src/components/members/MemberDetail.tsx	Modify (clickable links)
A	src/components/campaigns/CampaignList.tsx	Modify (audience column)
A	src/components/campaigns/CampaignDetail.tsx	Modify (segment name)
B	supabase/migrations/018_member_notes.sql	Create
B	src/types/member.ts	Modify (note + timeline types)
B	src/services/members/memberNoteService.ts	Create
B	src/services/members/useMemberNotes.ts	Create
B	src/services/members/index.ts	Modify (exports)
B	src/lib/queryKeys.ts	Modify (notes key)
B	src/components/members/MemberDetail.tsx	Modify (notes tab)
C	src/services/analytics/analyticsService.ts	Modify (follow-up query)
C	src/services/analytics/useAnalytics.ts	Modify (hook)
C	src/services/analytics/index.ts	Modify (exports)
C	src/components/dashboard/FollowUpWidget.tsx	Create
C	src/components/dashboard/index.ts	Modify (export)
C	src/pages/DashboardPage.tsx	Modify (add widget)
D	src/utils/memberTimeline.ts	Create
D	src/components/members/MemberDetail.tsx	Modify (timeline tab)
E	4 new test files	Create
Execution Order

Phase A (no dependencies) → Phase B + C (parallel) → Phase D (needs B for notes data) → Tests
Verification
Phase A: Open MemberDetail — click email/phone links, verify they open mail client / dialer. Open Campaign list — verify audience column shows segment names.
Phase B: Create/edit/delete notes in MemberDetail Notes tab. Verify pinned notes appear first. Check RLS by confirming notes are user-scoped.
Phase C: Check dashboard — FollowUpWidget shows at-risk/inactive members sorted by LTV. Click a member row to navigate to their detail.
Phase D: Open MemberDetail Timeline tab — verify all event types appear in chronological order with correct color coding.
Tests: npm run test — all new + existing tests pass. npm run test:coverage — maintains 70%+ coverage.