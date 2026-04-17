import { redirect } from "next/navigation";

type RootPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: RootPageProps) {
  const params = (await searchParams) ?? {};
  const code = readParam(params.code);
  const state = readParam(params.state);
  const error = readParam(params.error);
  const errorDescription = readParam(params.error_description);

  if (code || state || error) {
    const callbackParams = new URLSearchParams();
    if (code) callbackParams.set("code", code);
    if (state) callbackParams.set("state", state);
    if (error) callbackParams.set("error", error);
    if (errorDescription) callbackParams.set("error_description", errorDescription);

    return redirect(`/api/bis/callback?${callbackParams.toString()}`);
  }

  return redirect("/lv");
}
