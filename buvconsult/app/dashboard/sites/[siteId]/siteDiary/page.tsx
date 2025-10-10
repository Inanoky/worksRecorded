// app/[...]/page.tsx  (Server Component)
import SiteDiaryCalendar from "@/components/sitediary/Calendar";
import AiWidgetRag from "@/components/ai/AiChat";

export default function Home({
  params,
}: {
  params: { siteId: string };
}) {
  const { siteId } = params;

  return (
    <>
      <SiteDiaryCalendar siteId={siteId} />
      <AiWidgetRag siteId={siteId} />
    </>
  );
}
