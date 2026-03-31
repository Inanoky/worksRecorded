import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/dashboard/SubmitButtons";
import { getBisAuthorizeUrl, isBisHostedAuthorizationEnabled } from "@/server/actions/BIS/service";
import { assignBisCaseToSiteAction, completeBisManualAuthorizationAction, disconnectBisAction } from "@/server/actions/bis-settings-actions";

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
  hasManualAuthorizationCode,
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
  hasManualAuthorizationCode: boolean;
}) {
  const manualAuthorizeHref = getBisAuthorizeUrl("manual-bis-connect");
  const hostedAuthorizeHref = `/api/bis/connect?siteId=${encodeURIComponent(siteId)}&returnTo=${encodeURIComponent(`/dashboard/sites/${siteId}/settings`)}`;
  const useHostedAuthorization = isBisHostedAuthorizationEnabled();

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
              useHostedAuthorization ? (
                <div className="space-y-3">
                  <Button asChild>
                    <Link href={hostedAuthorizeHref}>Connect BIS</Link>
                  </Button>

                  <div className="max-w-2xl rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Hosted BIS connection</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4">
                      <li>Click <span className="font-medium text-foreground">Connect BIS</span>.</li>
                      <li>Complete BIS authorization and consent.</li>
                      <li>BIS redirects back to WorksRecorded callback route, and the app exchanges the authorization code automatically.</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button asChild>
                    <Link href={manualAuthorizeHref} target="_blank" rel="noreferrer">Open BIS authorization</Link>
                  </Button>

                  <div className="max-w-2xl rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Manual BIS connection</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4">
                      <li>Open BIS authorization in a new tab and complete the consent flow.</li>
                      <li>Copy the <code>code</code> value from the final redirected URL.</li>
                      <li>Either paste that code in the field below or set <code>BIS_AUTHORIZATION_CODE</code> in your environment.</li>
                      <li>Click the button below to exchange the authorization code for BIS tokens for your current user.</li>
                    </ol>
                  </div>

                  <form action={completeBisManualAuthorizationAction} className="space-y-2 max-w-2xl">
                    <input type="hidden" name="siteId" value={siteId} />
                    <label className="block text-xs font-medium text-foreground" htmlFor="bis-manual-authorization-code">
                      Authorization code (optional if environment variable is set)
                    </label>
                    <input
                      id="bis-manual-authorization-code"
                      name="authorizationCode"
                      type="text"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Paste BIS authorization code"
                    />
                    <SubmitButton
                      text="Complete BIS connection"
                      variant="secondary"
                      className="w-fit"
                    />
                  </form>

                  {!hasManualAuthorizationCode ? (
                    <p className="text-xs text-muted-foreground">Paste an authorization code above, or set <code>BIS_AUTHORIZATION_CODE</code> in the environment before completing the connection.</p>
                  ) : null}
                </div>
              )
            ) : (
              <form action={disconnectBisAction}>
                <input type="hidden" name="siteId" value={siteId} />
                <SubmitButton text="Disconnect BIS" variant="destructive" className="w-fit" />
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
              <form
                action={async (formData) => {
                  "use server";
                  const selectedId = String(formData.get("bisCaseId") ?? "");
                  const selected = availableCases.find((item) => item.id === selectedId);
                  formData.set("bisCaseNumber", selected?.caseNumber ?? "");
                  formData.set("bisCaseName", selected?.constructionName ?? "");
                  formData.set("bisCaseStage", selected?.stageName ?? "");
                  await assignBisCaseToSiteAction(formData);
                }}
                className="mt-3 space-y-3"
              >
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

                <SubmitButton text="Save BIS case" className="w-fit" />
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
