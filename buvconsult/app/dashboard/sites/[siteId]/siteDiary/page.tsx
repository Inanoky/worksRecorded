// app/[...]/page.tsx  (Server Component)
import SiteDiaryCalendar from "@/components/sitediary/Calendar";
import AiWidgetRag from "@/components/ai/AiChat";

export default async function Home({
  params,
}: {
  params: { siteId: string };
}) {
  const { siteId } = await params;

  return (
    <>
      <SiteDiaryCalendar siteId={siteId} />
      <AiWidgetRag siteId={siteId} />
    </>
  );
}
