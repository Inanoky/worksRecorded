// app/(marketing)/pricing/page.tsx — Mobile-first; desktop layout preserved (center column on md+)



export default function Page() {
  return (
    <>
      <section className="p-5 relative flex items-center justify-center">
        <div className="w-full mx-auto px-4 sm:px-6 py-10 lg:py-20">
          <div className="text-center">
            <h1 className="mt-4 sm:mt-8 text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-medium leading-tight sm:leading-none">
              Pricing
            </h1>
          </div>

          {/* Central column on desktop; stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-start w-full py-10 mx-auto mt-6 md:mt-12">
            {/* Subscription */}
            <div className="md:col-start-2 space-y-4 text-base sm:text-lg md:text-xl leading-relaxed">
              <h2 className="text-xl sm:text-2xl font-semibold">SUBSCRIPTION</h2>

              <p className="text-muted-foreground">
                The cost of the service is determined by the amount of data that needs to be collected, analyzed, and
                structured.
              </p>

              <ul className="list-disc pl-5 sm:pl-6 space-y-2 marker:text-primary marker:text-base sm:marker:text-lg">
                <li>150 EUR/month per project up to 1&nbsp;M EUR.</li>
                <li>250 EUR/month per project up to 5&nbsp;M EUR.</li>
                <li>350 EUR/month per project up to 10&nbsp;M EUR.</li>
                <li>For larger projects, please contact sales.</li>
              </ul>
            </div>

            {/* Custom solution */}
            <div className="md:col-start-2 space-y-4 text-base sm:text-lg md:text-xl leading-relaxed mt-6 md:mt-10">
              <h2 className="text-xl sm:text-2xl font-semibold">Custom solution</h2>

              <p className="text-muted-foreground">
                We have our own platform and custom data solutions that we adapt to different client needs. This means
                you get a tailored software solution for a fraction of the cost you’d expect from a digital agency.
              </p>
              <p className="text-muted-foreground">
                We speak the construction language, so it’s easy for you to explain your needs — we’ll quickly
                understand your processes and deliver a digital solution that solves your specific problem.
              </p>

              <p>
                Contact us to book a <span className="font-semibold">free consultation</span>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
