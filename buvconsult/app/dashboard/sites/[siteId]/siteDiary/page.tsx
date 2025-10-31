// app/[...]/page.tsx  (Server Component)
import SiteDiaryCalendar from "@/components/sitediary/Calendar";
import AiWidgetRag from "@/components/ai/AiChat";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";



export default async function Home({
  params,
}: {
  params: { siteId: string };
}) {

  const { siteId } = await params;
  const user = await requireUser();
  const siteCheck = await orgCheck(user.id, siteId);
  if (!siteCheck) {
    notFound();
  }




  return (
    <>

      <SiteDiaryCalendar siteId={siteId} />
      <AiWidgetRag siteId={siteId} />
    </>
  );
}
