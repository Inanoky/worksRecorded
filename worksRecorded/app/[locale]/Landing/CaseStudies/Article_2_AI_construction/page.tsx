import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";

const sources = {
  caterpillar:
    "https://www.ivtinternational.com/news/construction/autonomous-cs12-conexpo.html",
  oracle:
    "https://www.oracle.com/news/announcement/oracle-transforms-construction-safety-management-with-ai-2026-03-05/",
  autodesk:
    "https://adsknews.autodesk.com/en/news/autodesk-invests-in-world-labs/",
  wsp: "https://www.constructiondive.com/news/wsp-cautions-ai-hysteria-earnings/813338/",
};

export default function AIConstructionWeeklyHighlightsArticle() {
  const locale = useLocale();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href={`/${locale}/Landing/CaseStudies`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to case studies
      </Link>

      {/* Hero */}
      <section className="mt-4">
        <div className="overflow-hidden rounded-2xl border">
      
        </div>

        <h1 className="mt-6 text-3xl font-semibold leading-tight md:text-4xl">
          AI in Construction: Last Week’s Highlights (2–9 Mar 2026)
        </h1>

        <p className="mt-3 text-lg text-muted-foreground">
          From autonomous equipment at CONEXPO to predictive safety platforms
          and physical-world AI, the last week showed how quickly artificial
          intelligence is moving from hype into real construction workflows.
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>Published: March 2026</span>
          <span>•</span>
          <span>Construction AI</span>
          <span>•</span>
          <span>Autonomy, Safety, Data</span>
        </div>
      </section>

      <div className="my-8 h-px bg-border" />

      {/* Quick links */}
      <section className="rounded-2xl border bg-muted/30 p-6">
        <h2 className="text-xl font-semibold">Sources</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href={sources.caterpillar}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border bg-background p-4 transition hover:bg-muted"
          >
            <div className="font-medium">Caterpillar / CONEXPO autonomy</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Autonomous CS12 compactor and Cat AI Assistant.
            </p>
          </a>

          <a
            href={sources.oracle}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border bg-background p-4 transition hover:bg-muted"
          >
            <div className="font-medium">Oracle Advisor for Safety</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Predictive safety platform for construction.
            </p>
          </a>

          <a
            href={sources.autodesk}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border bg-background p-4 transition hover:bg-muted"
          >
            <div className="font-medium">Autodesk × World Labs</div>
            <p className="mt-1 text-sm text-muted-foreground">
              $200M investment in physical-world AI.
            </p>
          </a>

          <a
            href={sources.wsp}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border bg-background p-4 transition hover:bg-muted"
          >
            <div className="font-medium">WSP on “AI hysteria”</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Why human oversight stays central.
            </p>
          </a>
        </div>
      </section>

      <div className="my-10 h-px bg-border" />

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Autonomy Takes Center Stage at CONEXPO 2026
        </h2>

        <p className="text-base leading-7 text-foreground/90">
          The 2026 CONEXPO-CON/AGG show in Las Vegas made one thing clear:
          manufacturers are no longer talking about AI as a future concept.
          They are shipping it into real equipment and using it to address labor
          shortages, safety challenges and operational efficiency.
        </p>

        <p className="text-base leading-7 text-foreground/90">
          Exhibitors highlighted intelligent systems that automate repetitive
          tasks such as grading and compaction, while also introducing digital
          tools designed to turn job-site data into more actionable insight.
          The direction is practical rather than theoretical: fewer repetitive
          manual inputs, better precision and more visibility into project
          performance.
        </p>

        <a
          href={sources.caterpillar}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Read source →
        </a>
      </section>

      <div className="my-10 h-px bg-border" />

      {/* Section 2 with image */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">
          Caterpillar’s Autonomous Compactor & AI Assistant
        </h2>

        <div className="overflow-hidden rounded-2xl border">

        </div>

        <p className="text-sm text-muted-foreground">
          Cat CS12 autonomous soil compactor shown ahead of CONEXPO 2026.
        </p>

        <p className="text-base leading-7 text-foreground/90">
          Caterpillar drew major attention by demonstrating its CS12 soil
          compactor operating with nobody in the cab. That made it one of the
          clearest live-show examples of construction autonomy moving beyond
          concept demos and into real machine workflows.
        </p>

        <p className="text-base leading-7 text-foreground/90">
          The company also highlighted Cat Command, which allows one operator to
          supervise multiple machines remotely, and launched the Cat AI
          Assistant across service and support workflows such as parts lookup,
          troubleshooting, manuals and fleet monitoring.
        </p>

        <a
          href={sources.caterpillar}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Read Caterpillar / IVT coverage →
        </a>
      </section>

      <div className="my-10 h-px bg-border" />

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          WSP’s “Machine-in-the-Middle” Approach
        </h2>

        <p className="text-base leading-7 text-foreground/90">
          Not every headline was about replacing people. WSP used its earnings
          commentary to push back against exaggerated AI narratives and made the
          case that engineering remains deeply tied to field judgment,
          accountability and proprietary expertise.
        </p>

        <p className="text-base leading-7 text-foreground/90">
          Its “machine-in-the-middle” framing is probably one of the most useful
          ways to think about AI in construction: let software accelerate
          analysis and reporting, but keep humans responsible for review,
          validation and final decisions.
        </p>

        <a
          href={sources.wsp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Read source →
        </a>
      </section>

      <div className="my-10 h-px bg-border" />

      {/* Section 4 with image */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">
          Oracle’s AI Platform for Predictive Safety
        </h2>

        <div className="overflow-hidden rounded-2xl border">
    
        </div>

        <p className="text-sm text-muted-foreground">
          Oracle Advisor for Safety interface showing weekly project risk
          forecasts.
        </p>

        <p className="text-base leading-7 text-foreground/90">
          Oracle introduced Advisor for Safety as a predictive layer for
          construction safety management. Instead of waiting for incidents and
          reacting afterward, the platform is designed to forecast which
          projects are statistically more likely to experience safety issues.
        </p>

        <p className="text-base leading-7 text-foreground/90">
          It combines historical safety data with structured field observations
          and project inputs, making AI useful in one of the most important
          areas of construction: prevention rather than paperwork.
        </p>

        <a
          href={sources.oracle}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Read Oracle announcement →
        </a>
      </section>

      <div className="my-10 h-px bg-border" />

      {/* Section 5 with image */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">
          Autodesk’s $200 Million Bet on Physical AI
        </h2>

        <div className="overflow-hidden rounded-2xl border">
      
        </div>

        <p className="text-sm text-muted-foreground">
          Autodesk technology center, used here alongside coverage of the World
          Labs investment.
        </p>

        <p className="text-base leading-7 text-foreground/90">
          Autodesk’s $200 million investment in World Labs shows where some of
          the biggest construction-tech bets are heading: AI that understands
          space, geometry and the 3D physical world rather than only text.
        </p>

        <p className="text-base leading-7 text-foreground/90">
          That matters for construction because physical-world AI could support
          design, prefabrication, progress tracking, inspection, reality capture
          and digital twins. The underlying theme is that better spatial
          reasoning should create more useful tools for people who build real
          things.
        </p>

        <a
          href={sources.autodesk}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Read Autodesk announcement →
        </a>
      </section>

      <div className="my-10 h-px bg-border" />

      {/* Why it matters */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">Why These Trends Matter</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-muted/20 p-5">
            <h3 className="text-lg font-medium">Safety & Productivity</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              AI is increasingly being used to reduce incidents, shorten
              learning curves and improve performance on site.
            </p>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-5">
            <h3 className="text-lg font-medium">Autonomy with Oversight</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Autonomous machines are reaching live job-site workflows, but
              serious firms still keep people in the loop.
            </p>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-5">
            <h3 className="text-lg font-medium">Physical World AI</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              More investment is going into AI that understands the built
              environment in 3D, not just documents and chat.
            </p>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-5">
            <h3 className="text-lg font-medium">Data Utilisation</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Construction companies are finally trying to turn unused project
              data into decisions that improve safety, cost control and delivery.
            </p>
          </div>
        </div>
      </section>

      <div className="my-10 h-px bg-border" />

      {/* Closing */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Final Thoughts</h2>
        <p className="text-base leading-7 text-foreground/90">
          The clearest takeaway from the week is that AI in construction is
          becoming more operational and less abstract. The most promising tools
          are not the ones trying to replace builders, engineers or site teams.
          They are the ones helping people work safer, faster and with better
          information.
        </p>
      </section>
    </main>
  );
}