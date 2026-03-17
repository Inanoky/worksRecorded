// worksRecorded/app/privacy/page.tsx
// Simple Privacy Policy page ready to paste into Next.js App Router

import type { Metadata } from "next";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing/Privacy",
    title: "Privacy Policy | WorksRecorded",
    description:
      "Read the WorksRecorded privacy policy for data handling, GDPR rights, and platform security details.",
    keywords: [
      "construction software",
      "AI tools",
      "AI in construction",
      "construction technology",
      "WorksRecorded",
    ],
  });
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy – WorksRecorded</h1>
      <p className="mb-6">Last updated: 27 February 2026</p>

      <Section title="1. Information We Collect">
        <p>
          We may collect account information (name, company, phone number, email), WhatsApp data
          such as voice notes, photos, inspection reports, site diary entries, and technical
          information like IP address and usage logs.
        </p>
      </Section>

      <Section title="2. How We Use Your Information">
        <p>
          We use data to provide WorksRecorded services, convert WhatsApp messages into structured
          construction records, generate site diaries and inspection reports, integrate with
          external systems (like national construction logbooks), improve the software, and
          provide support.
        </p>
      </Section>

      <Section title="3. WhatsApp and Meta Platforms">
        <p>
          WorksRecorded uses WhatsApp Business API provided by Meta Platforms, Inc. Messages sent
          to our business number may be processed to create structured construction reports.
          Meta Privacy Policy: https://www.meta.com/privacy
        </p>
      </Section>

      <Section title="4. Data Sharing">
        <p>
          We may share data with your company administrators, authorized project stakeholders,
          secure service providers, or when required by law. We never sell personal data.
        </p>
      </Section>

      <Section title="5. Data Storage and Security">
        <p>
          Data is stored on secure EU-based cloud servers with encryption, access control, and
          logging. Only authorised users can access project information.
        </p>
      </Section>

      <Section title="6. Data Retention">
        <p>
          Data is retained only as long as necessary to provide services or meet legal
          requirements. Companies may request deletion at any time.
        </p>
      </Section>

      <Section title="7. Your Rights (GDPR)">
        <p>
          EU users have the right to access, correct, delete, restrict, or transfer their data.
          Contact us to exercise these rights.
        </p>
      </Section>

      <Section title="8. Children’s Privacy">
        <p>
          WorksRecorded is designed for professional construction companies and is not intended
          for children under 16.
        </p>
      </Section>

      <Section title="9. Contact Us">
        <p>
          Email: support@worksrecorded.com <br />
          Website: https://www.worksrecorded.com
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div className="text-sm leading-6">{children}</div>
    </section>
  );
}