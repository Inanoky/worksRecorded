import Image from "next/image";
import Link from "next/link";

export default function DepromCaseStudy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/Landing/CaseStudies"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to case studies
      </Link>

      <h1 className="mt-4 text-3xl font-semibold">
        U-fix: Combining site diary with authority reporting
      </h1>

      <p className="mt-3 text-muted-foreground">
        U-fix is one of the largest in-situ contractors in Latvia. WorksRecorded helped automate daily reporting
        for the Latvian BIS construction reporting system. 
      </p>

      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        <Image
          src="/pictures/Ufix.jpg"
          alt="Deprom case study cover"
          fill
          className="object-cover"
        />
      </div>

      <section className="prose prose-neutral dark:prose-invert mt-10 max-w-none">

         <h2>Project</h2>
        <p>
          Terbatas Garden (Tērbatas Dārzs) - Tērbatas iela 78A, Rīga
        </p>

        <h2>Problem</h2>
        <p>
          Authority reporting took a lot of admin. U-fix needed system to reduce time spent
        </p>

        <h2>Solution</h2>
        <p>
          Site managers sent WhatsApp voice notes + photos. WorksRecorded integrated reproting with BIS API system.
        </p>

      

        <h2>Want the same workflow?</h2>
        <p>
          Try WorksRecorded on a pilot project.
        </p>
      </section>

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
