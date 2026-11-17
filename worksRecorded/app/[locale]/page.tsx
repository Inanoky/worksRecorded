import { redirect } from "next/navigation";
import { getHomeDestination } from "@/lib/auth/home-entry";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleHomePage({ params }: PageProps) {
  const { locale } = await params;
  redirect(await getHomeDestination(locale));
}
