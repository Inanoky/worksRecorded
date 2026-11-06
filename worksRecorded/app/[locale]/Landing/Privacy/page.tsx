import type { Metadata } from "next";
import Link from "next/link";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
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

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">
        Privacy Policy – WorksRecorded
      </h1>
      <p className="mb-6">Last updated: 14 October 2026</p>
      <p className="mb-6">
        WorksRecorded is operated by Buvconsult SIA, Latvia.
      </p>

      <Section title="1. Information We Collect">
        <p>
          We may collect account information (name, company, phone number,
          email), WhatsApp data such as voice notes, photos, inspection reports,
          site diary entries, and technical information like IP address and
          usage logs.
        </p>
      </Section>

      <Section title="2. How We Use Your Information">
        <p>
          We use data to provide WorksRecorded services, convert WhatsApp
          messages into structured construction records, generate site diaries
          and inspection reports, integrate with external systems (like national
          construction logbooks), improve the software, and provide support.
        </p>
      </Section>

      <Section title="3. WhatsApp and Meta Platforms">
        <p>
          WorksRecorded uses WhatsApp Business API provided by Meta Platforms,
          Inc. Messages sent to our business number may be processed to create
          structured construction reports. Meta Privacy Policy:
          https://www.meta.com/privacy
        </p>
      </Section>

      <Section title="4. Data Sharing">
        <p>
          We may share data with your company administrators, authorized project
          stakeholders, secure service providers, or when required by law. We
          never sell personal data.
        </p>
        <p className="mt-3">
          We use Vercel to host the application, OpenAI to transcribe voice
          notes and process work updates, and UploadThing to store uploaded
          media. These providers process the information needed to perform those
          services.
        </p>
      </Section>

      <Section title="5. Data Storage and Security">
        <p>
          WorksRecorded uses cloud infrastructure and service providers that may
          process data outside the European Union, including in the United
          States. The application uses access controls to manage access to
          project information.
        </p>
      </Section>

      <Section title="6. Data Retention">
        <p>
          Data is retained only as long as necessary to provide services or meet
          legal requirements. Companies may request deletion at any time.
        </p>
      </Section>

      <Section title="7. Your Rights (GDPR)">
        <p>
          EU users have the right to access, correct, delete, restrict, or
          transfer their data. Contact us to exercise these rights.
        </p>
        <p className="mt-3">
          See our{" "}
          <Link href={`/${locale}/Landing/DataDeletion`} className="underline">
            data deletion instructions
          </Link>{" "}
          to request deletion of your account information or data processed
          through WhatsApp.
        </p>
      </Section>

      <Section title="8. Children’s Privacy">
        <p>
          WorksRecorded is designed for professional construction companies and
          is not intended for children under 16.
        </p>
      </Section>

      <Section title="9. Contact Us">
        <p>
          Email:{" "}
          <a href="mailto:vjaceslavs@worksrecorded.com" className="underline">
            vjaceslavs@worksrecorded.com
          </a>{" "}
          <br />
          Website: https://www.worksrecorded.com
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div className="text-sm leading-6">{children}</div>
    </section>
  );
}
