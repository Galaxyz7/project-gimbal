/**
 * Help Page
 * Getting started guide, feature overview, FAQ, and compliance reference
 */

import { memo } from 'react';
import { AppLayout } from '../components/layout';
import { Card } from '../components/common/Card';
import { useNavigation } from '../hooks/useNavigation';

// =============================================================================
// Content Sections
// =============================================================================

function GettingStarted() {
  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold text-[#003559] mb-4">Getting Started</h2>
      <ol className="space-y-4 text-sm text-gray-700">
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#0353a4] text-white rounded-full text-xs font-bold">1</span>
          <div>
            <p className="font-medium text-[#003559]">Import your audience</p>
            <p className="text-gray-500 mt-0.5">
              Go to <strong>Import</strong> and connect a CSV file, database, or analytics platform to bring your member data into Gimbal.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#0353a4] text-white rounded-full text-xs font-bold">2</span>
          <div>
            <p className="font-medium text-[#003559]">Configure messaging</p>
            <p className="text-gray-500 mt-0.5">
              Set up your Twilio (SMS) and SendGrid (Email) credentials in <strong>Admin &rarr; Settings</strong> to enable campaign sending.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#0353a4] text-white rounded-full text-xs font-bold">3</span>
          <div>
            <p className="font-medium text-[#003559]">Create a campaign</p>
            <p className="text-gray-500 mt-0.5">
              Navigate to <strong>Campaigns</strong> and create your first SMS or Email campaign. Use a template or start from scratch.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#0353a4] text-white rounded-full text-xs font-bold">4</span>
          <div>
            <p className="font-medium text-[#003559]">Send and track</p>
            <p className="text-gray-500 mt-0.5">
              Schedule or send your campaign immediately, then track delivery, opens, and clicks on the campaign report dashboard.
            </p>
          </div>
        </li>
      </ol>
    </Card>
  );
}

function Features() {
  const features = [
    { title: 'Campaigns', desc: 'Create and send SMS and Email campaigns with templates, scheduling, and delivery tracking.' },
    { title: 'Templates', desc: 'Reusable campaign templates with variable placeholders. Start from scratch or use a starter template.' },
    { title: 'Audience', desc: 'Manage your member database with multi-site support, LTV tracking, and consent management.' },
    { title: 'Segments', desc: 'Build audience segments with rules to target specific groups across campaigns.' },
    { title: 'Import', desc: 'Connect CSV files, databases, GA4, and Meta Pixel with one-time or scheduled syncs.' },
    { title: 'Dashboard', desc: 'Real-time analytics with metrics, charts, and campaign performance widgets.' },
  ];

  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold text-[#003559] mb-4">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f) => (
          <div key={f.title} className="p-3 bg-[#f5f5f5] rounded-lg">
            <h3 className="text-sm font-medium text-[#003559]">{f.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Compliance() {
  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold text-[#003559] mb-4">Compliance</h2>
      <div className="space-y-4 text-sm">
        <div>
          <h3 className="font-medium text-[#003559]">TCPA (SMS)</h3>
          <ul className="mt-1 space-y-1 text-gray-600 list-disc list-inside">
            <li>Prior express written consent is required before sending SMS</li>
            <li>Opt-out via STOP keyword is honored immediately</li>
            <li>Quiet hours enforced: 8 AM &ndash; 9 PM recipient&apos;s local timezone</li>
            <li>Consent timestamps are recorded and retained</li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-[#003559]">CAN-SPAM (Email)</h3>
          <ul className="mt-1 space-y-1 text-gray-600 list-disc list-inside">
            <li>Physical postal address included in every email</li>
            <li>Clear unsubscribe mechanism in every email</li>
            <li>Unsubscribe requests honored within 10 business days</li>
            <li>Honest subject lines &mdash; no deceptive content</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

function FAQ() {
  const faqs = [
    {
      q: 'How do I add a new member manually?',
      a: 'Go to Audience and click "Add Member". Fill in the required fields and assign them to a site.',
    },
    {
      q: 'Can I send a test message before launching a campaign?',
      a: 'Yes. On the campaign detail page, use the "Send Test" button to send a single test message to yourself.',
    },
    {
      q: 'What happens when a member texts STOP?',
      a: 'Their opt-out is recorded immediately and they will no longer receive SMS campaigns. This is required by TCPA.',
    },
    {
      q: 'How do I schedule a recurring data import?',
      a: 'In the Import wizard, choose a schedule frequency (hourly, daily, weekly, or monthly) during the Schedule step.',
    },
  ];

  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold text-[#003559] mb-4">FAQ</h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i}>
            <h3 className="text-sm font-medium text-[#003559]">{faq.q}</h3>
            <p className="text-sm text-gray-500 mt-1">{faq.a}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// =============================================================================
// Component
// =============================================================================

export const HelpPage = memo(function HelpPage() {
  const { navItems } = useNavigation();

  return (
    <AppLayout navItems={navItems} pageTitle="Help">
      <div className="space-y-6 max-w-4xl">
        <GettingStarted />
        <Features />
        <Compliance />
        <FAQ />

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-[#003559] mb-2">Need Help?</h2>
          <p className="text-sm text-gray-600">
            Contact your system administrator for account issues, configuration changes, or technical support.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
});

export default HelpPage;
