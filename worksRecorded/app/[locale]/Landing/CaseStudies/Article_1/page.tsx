import Image from "next/image";
import Link from "next/link";

export default function ContractorSoftwareArticle() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {/* Back link */}
      <Link
        href="/Landing/CaseStudies"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to case studies
      </Link>

      {/* Title */}
      <h1 className="mt-4 text-3xl font-semibold">
        Why Most Contractor Software Fails — And What Actually Works
      </h1>

      {/* Intro */}
      <p className="mt-3 text-muted-foreground">
        Most construction software promises efficiency, cost control, and better
        reporting. In reality, many platforms fail to deliver real value on site.
        This article explains why — and how WorksRecorded takes a different
        approach.
      </p>

      {/* Cover Image */}
      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        <Image
          src="/pictures/article_1.jpg"
          alt="Construction site reporting with WhatsApp"
          fill
          className="object-cover"
        />
      </div>

      {/* Article Body */}
      <section className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
        <h2>Why Most Contractor Software Fails</h2>

        <p>
          Truth is, there aren’t many truly good software solutions for
          contractors. Many systems are built without understanding how
          construction really works on site.
        </p>

        <p>Common problems include:</p>

        <ul>
          <li>Too complicated to onboard and use daily</li>
          <li>Just another tool instead of a practical solution</li>
          <li>Trying to do everything at once</li>
          <li>High cost without clear return</li>
          <li>Ignoring existing workflows</li>
          <li>Built without real industry experience</li>
        </ul>

        <p>
          The result is low adoption, inconsistent reporting, and wasted
          investment.
        </p>

        <h2>What Good Contractor Software Looks Like</h2>

        <p>Effective contractor software should be:</p>

        <ul>
          <li>Simple</li>
          <li>Effective</li>
          <li>Affordable</li>
          <li>Quick to integrate</li>
          <li>Useful from the first minute</li>
        </ul>

        <p>
          It should fit naturally into daily site work, not disrupt it.
        </p>

        <h2>Custom Digital Solutions at an Understandable Price</h2>

        <p>
          WorksRecorded focuses on adapting to existing contractor workflows
          instead of forcing new systems.
        </p>

        <p>Our approach includes:</p>

        <ul>
          <li>Transforming workflows into WhatsApp processes</li>
          <li>Digitising paper and Excel forms</li>
          <li>Creating WhatsApp punchlists for inspections</li>
          <li>Enabling timesheets with geolocation</li>
          <li>Integrating with existing CRM systems</li>
          <li>Providing reports in familiar formats</li>
        </ul>

        <p>
          No complex training. No unnecessary features. Just practical tools.
        </p>

        <h2>Using Site Records to Forecast Project Costs</h2>

        <p>
          Accurate data is the foundation of profitable projects. WorksRecorded
          helps contractors forecast costs in real time.
        </p>

        <h3>1. Daily Site Reporting</h3>
        <p>
          Site managers send voice notes and photos via WhatsApp, describing who
          did what on site.
        </p>

        <h3>2. Cost per Unit Analysis</h3>
        <p>
          Work quantities and labour hours are analysed to calculate the real
          cost per unit.
        </p>

        <h3>3. Live Forecasting</h3>
        <p>
          Project cost forecasts are updated daily, helping managers act early
          when risks appear.
        </p>

        <h2>Real Benefits for Contractors</h2>

        <ul>
          <li>All working hours accounted for</li>
          <li>Reduced administration</li>
          <li>Reliable historical data</li>
          <li>Clear cost structure</li>
          <li>Better decision-making</li>
          <li>No surprises at project closeout</li>
        </ul>

        <p>
          Data collected today remains useful for years to come.
        </p>

        <h2>Simple. Practical. Effective.</h2>

        <p>
          Construction software should save time, reduce admin, and improve cost
          control — not create more work.
        </p>

        <p>
          WorksRecorded is built for real site conditions, real workflows, and
          real results.
        </p>

        <h2>Ready to Try It?</h2>

        <p>
          Start with a pilot project and see how structured site data can improve
          productivity and cost control from day one.
        </p>
      </section>

      {/* CTA */}
      <div className="mt-10">
        <a
          href="https://www.worksrecorded.com/"
          className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Visit worksrecorded.com
        </a>
      </div>
    </main>
  );
}
