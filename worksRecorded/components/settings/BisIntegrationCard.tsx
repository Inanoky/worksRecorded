import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { assignBisCaseToSiteAction, disconnectBisAction } from "@/server/actions/bis-settings-actions";

type BisCaseOption = {
  id: string;
  caseNumber: string | null;
  constructionName: string | null;
  stageName: string | null;
};

export function BisIntegrationCard({
  siteId,
  isConnected,
  selectedCase,
  availableCases,
  statusMessage,
}: {
  siteId: string;
  isConnected: boolean;
  selectedCase: {
    id: string | null;
    caseNumber: string | null;
    name: string | null;
    stage: string | null;
  };
  availableCases: BisCaseOption[];
  statusMessage?: string | null;
}) {
  const connectHref = `/api/bis/connect?siteId=${encodeURIComponent(siteId)}&returnTo=${encodeURIComponent(
    `/dashboard/sites/${siteId}/settings`,
  )}`;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>BIS integration</CardTitle>
        <CardDescription>
          Connect your BIS account, then lock this site to a single BIS case.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {statusMessage ? (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {statusMessage}
          </div>
        ) : null}

        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Connection status</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isConnected
              ? "BIS is connected for your user account."
              : "BIS is not connected. BIS actions stay hidden until you connect and assign a case."}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {!isConnected ? (
              <Button asChild>
                <Link href={connectHref}>Connect BIS</Link>
              </Button>
            ) : (
              <form action={disconnectBisAction}>
                <input type="hidden" name="siteId" value={siteId} />
                <Button type="submit" variant="destructive">
                  Disconnect BIS
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">BIS case for this site</div>
          {selectedCase.id ? (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Case:</span>{" "}
                {selectedCase.caseNumber || selectedCase.id}
              </p>
              <p>
                <span className="font-medium text-foreground">Project:</span>{" "}
                {selectedCase.name || "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Stage:</span>{" "}
                {selectedCase.stage || "—"}
              </p>
              <p className="pt-1 text-xs">
                This selection is locked for the site and cannot be changed.
              </p>
            </div>
          ) : isConnected ? (
            availableCases.length > 0 ? (
              <form action={assignBisCaseToSiteAction} className="mt-3 space-y-3">
                <input type="hidden" name="siteId" value={siteId} />
                <select
                  name="bisCaseId"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a BIS case
                  </option>
                  {availableCases.map((bisCase) => (
                    <option key={bisCase.id} value={bisCase.id}>
                      {bisCase.caseNumber || bisCase.id} — {bisCase.constructionName || "Unnamed case"}
                      {bisCase.stageName ? ` (${bisCase.stageName})` : ""}
                    </option>
                  ))}
                </select>

                <input type="hidden" name="bisCaseNumber" value="" />
                <input type="hidden" name="bisCaseName" value="" />
                <input type="hidden" name="bisCaseStage" value="" />

                <Button
                  type="submit"
                  formAction={async (formData) => {
                    "use server";
                    const selectedId = String(formData.get("bisCaseId") ?? "");
                    const selected = availableCases.find((item) => item.id === selectedId);
                    formData.set("bisCaseNumber", selected?.caseNumber ?? "");
                    formData.set("bisCaseName", selected?.constructionName ?? "");
                    formData.set("bisCaseStage", selected?.stageName ?? "");
                    await assignBisCaseToSiteAction(formData);
                  }}
                >
                  Save BIS case
                </Button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                BIS is connected, but no authorized BIS cases were returned for this user.
              </p>
            )
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Connect BIS first to load cases for this site.
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        Disconnecting BIS only removes access tokens. Existing site diary and material records remain in the database.
      </CardFooter>
    </Card>
  );
}
