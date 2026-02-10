-- Migration: 011_starter_templates
-- Description: Add system template support and seed starter templates
-- Date: 2026-02-10

-- =============================================================================
-- Add is_system column to campaign_templates
-- =============================================================================

ALTER TABLE campaign_templates
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Index for system template queries
CREATE INDEX IF NOT EXISTS idx_campaign_templates_system
  ON campaign_templates(is_system) WHERE is_system = TRUE;

-- =============================================================================
-- Allow NULL user_id for system templates
-- =============================================================================

ALTER TABLE campaign_templates
  ALTER COLUMN user_id DROP NOT NULL;

-- =============================================================================
-- Update RLS policy to allow reading system templates
-- =============================================================================

-- Drop existing SELECT policy if it exists (we'll recreate with system template access)
DROP POLICY IF EXISTS "Users can read own templates" ON campaign_templates;
DROP POLICY IF EXISTS "Users can manage own templates" ON campaign_templates;

-- Users can read their own templates AND system templates
CREATE POLICY "Users can read templates"
  ON campaign_templates FOR SELECT
  USING (auth.uid() = user_id OR is_system = TRUE);

-- Users can only insert/update/delete their own templates (not system ones)
CREATE POLICY "Users can insert own templates"
  ON campaign_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can update own templates"
  ON campaign_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can delete own templates"
  ON campaign_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = FALSE);

-- =============================================================================
-- Seed SMS Starter Templates
-- =============================================================================

-- System templates use NULL user_id (no FK constraint needed)
-- Use WHERE NOT EXISTS to avoid duplicates (ON CONFLICT doesn't work with NULL)

DO $$
BEGIN

-- SMS: Welcome
INSERT INTO campaign_templates (user_id, name, description, template_type, content, is_system, is_active)
SELECT NULL, 'Welcome Message', 'Greet new members when they join', 'sms',
  'Hi {{firstName}}, welcome to {{siteName}}! We''re glad to have you. Reply STOP to opt out.',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Welcome Message' AND is_system = TRUE
);

-- SMS: Appointment Reminder
INSERT INTO campaign_templates (user_id, name, description, template_type, content, is_system, is_active)
SELECT NULL, 'Appointment Reminder', 'Remind members of upcoming appointments', 'sms',
  'Hi {{firstName}}, reminder: your appointment at {{siteName}} is coming up. See you soon! Reply STOP to opt out.',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Appointment Reminder' AND is_system = TRUE
);

-- SMS: Promotional Offer
INSERT INTO campaign_templates (user_id, name, description, template_type, content, is_system, is_active)
SELECT NULL, 'Promotional Offer', 'Send a limited-time promotional offer', 'sms',
  'Hi {{firstName}}, {{siteName}} has a special offer just for you! Visit us today to take advantage. Reply STOP to opt out.',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Promotional Offer' AND is_system = TRUE
);

-- SMS: Win-Back
INSERT INTO campaign_templates (user_id, name, description, template_type, content, is_system, is_active)
SELECT NULL, 'Win-Back Message', 'Re-engage inactive members', 'sms',
  'Hi {{firstName}}, we miss you at {{siteName}}! Come back and see what''s new. Reply STOP to opt out.',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Win-Back Message' AND is_system = TRUE
);

-- =============================================================================
-- Seed Email Starter Templates
-- =============================================================================

-- Email: Welcome
INSERT INTO campaign_templates (user_id, name, description, template_type, subject, preheader, content, is_system, is_active)
SELECT NULL, 'Welcome Email', 'Welcome email for new members', 'email',
  'Welcome to {{siteName}}!',
  'We''re excited to have you on board',
  'Hi {{firstName}},

Welcome to {{siteName}}! We''re thrilled to have you as a member.

Here''s what you can look forward to:
- Exclusive offers and promotions
- Updates on events and news
- Personalized recommendations

If you have any questions, don''t hesitate to reach out.

Best regards,
The {{siteName}} Team

{{unsubscribeUrl}}',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Welcome Email' AND is_system = TRUE
);

-- Email: Promotional Sale
INSERT INTO campaign_templates (user_id, name, description, template_type, subject, preheader, content, is_system, is_active)
SELECT NULL, 'Promotional Sale', 'Announce a sale or special promotion', 'email',
  'Special Offer Just for You, {{firstName}}!',
  'Don''t miss out on this limited-time deal',
  'Hi {{firstName}},

We have an exclusive offer waiting for you at {{siteName}}!

As a valued {{membershipLevel}} member, you get early access to our latest promotion. Don''t miss out — this offer won''t last long.

Visit us today to take advantage of this deal.

Best regards,
The {{siteName}} Team

{{unsubscribeUrl}}',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Promotional Sale' AND is_system = TRUE
);

-- Email: Newsletter
INSERT INTO campaign_templates (user_id, name, description, template_type, subject, preheader, content, is_system, is_active)
SELECT NULL, 'Monthly Newsletter', 'Regular newsletter update for members', 'email',
  '{{siteName}} Monthly Update',
  'See what''s new this month',
  'Hi {{firstName}},

Here''s your monthly update from {{siteName}}!

What''s New:
- [Add your updates here]

Upcoming Events:
- [Add your events here]

Member Spotlight:
- [Add member highlights here]

Thank you for being a valued member of our community.

Best regards,
The {{siteName}} Team

{{unsubscribeUrl}}',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Monthly Newsletter' AND is_system = TRUE
);

-- Email: Event Invite
INSERT INTO campaign_templates (user_id, name, description, template_type, subject, preheader, content, is_system, is_active)
SELECT NULL, 'Event Invitation', 'Invite members to an upcoming event', 'email',
  'You''re Invited: Special Event at {{siteName}}',
  'Join us for an exclusive event',
  'Hi {{firstName}},

You''re invited to a special event at {{siteName}}!

Event Details:
- Date: [Add date]
- Time: [Add time]
- Location: [Add location]

As a {{membershipLevel}} member, you have priority access.

We''d love to see you there!

Best regards,
The {{siteName}} Team

{{unsubscribeUrl}}',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Event Invitation' AND is_system = TRUE
);

-- Email: Membership Renewal
INSERT INTO campaign_templates (user_id, name, description, template_type, subject, preheader, content, is_system, is_active)
SELECT NULL, 'Membership Renewal', 'Remind members to renew their membership', 'email',
  'Your {{membershipLevel}} Membership is Coming Up for Renewal',
  'Don''t lose your member benefits',
  'Hi {{firstName}},

Your {{membershipLevel}} membership at {{siteName}} is coming up for renewal.

Don''t miss out on your member benefits:
- [List key benefits here]

Renew today to keep your membership active and continue enjoying everything {{siteName}} has to offer.

Best regards,
The {{siteName}} Team

{{unsubscribeUrl}}',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Membership Renewal' AND is_system = TRUE
);

-- Email: Feedback Request
INSERT INTO campaign_templates (user_id, name, description, template_type, subject, preheader, content, is_system, is_active)
SELECT NULL, 'Feedback Request', 'Ask members for their feedback', 'email',
  'We''d Love Your Feedback, {{firstName}}',
  'Help us improve your experience',
  'Hi {{firstName}},

We value your opinion! As a member of {{siteName}}, your feedback helps us improve.

We''d appreciate it if you could take a moment to share your thoughts:

1. How has your experience been so far?
2. What could we do better?
3. What do you enjoy most?

Simply reply to this email with your feedback.

Thank you for helping us grow!

Best regards,
The {{siteName}} Team

{{unsubscribeUrl}}',
  TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates WHERE name = 'Feedback Request' AND is_system = TRUE
);

END $$;
