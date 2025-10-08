// app/[...]/page.tsx  (Server Component)
import SiteDiaryCalendar from "@/componentsFrontend/SiteDiaryComponents/Calendar";
import AiWidgetRag from "@/componentsFrontend/AI/RAG/AiWidgetRag";

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
