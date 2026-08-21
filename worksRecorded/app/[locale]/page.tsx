import { permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleHomePage({ params }: PageProps) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/Landing`);
}
