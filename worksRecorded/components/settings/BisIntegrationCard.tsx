import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/dashboard/SubmitButtons";
import { getBisAuthorizeUrl, isBisHostedAuthorizationEnabled } from "@/server/actions/BIS/service";
import { assignBisCaseToSiteAction, completeBisManualAuthorizationAction, disconnectBisAction } from "@/server/actions/bis-settings-actions";
import { getSiteSettingsMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

type BisCaseOption = {
  id: string;
  caseNumber: string | null;
  constructionName: string | null;
  stageName: string | null;
};

export function BisIntegrationCard({
  organizationLanguage,
  siteId,
  isConnected,
  selectedCase,
  availableCases,
  statusMessage,
  hasManualAuthorizationCode,
}: {
  organizationLanguage?: string | null;
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
  const t = getSiteSettingsMessages(normalizeOrganizationLanguage(organizationLanguage));
  const manualAuthorizeHref = getBisAuthorizeUrl("manual-bis-connect");
  const hostedAuthorizeHref = `/api/bis/connect?siteId=${encodeURIComponent(siteId)}&returnTo=${encodeURIComponent(`/dashboard/sites/${siteId}/settings`)}`;
  const useHostedAuthorization = isBisHostedAuthorizationEnabled();
  const showManualAuthorizationInput = process.env.NODE_ENV !== "production";

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t.bisIntegration}</CardTitle>
        <CardDescription>
          {t.bisDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {statusMessage ? (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {statusMessage}
          </div>
        ) : null}

        <div className="rounded-lg border p-4">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="text-sm font-medium">{t.connectionStatus}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isConnected ? t.connected : t.disconnected}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {!isConnected ? (
                  useHostedAuthorization ? (
                    <div className="space-y-3">
                      <Button asChild>
                        <Link href={hostedAuthorizeHref}>{t.connectBis}</Link>
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
                        <p className="font-medium text-foreground">{t.manualBisConnection}</p>
                        <ol className="mt-2 list-decimal space-y-1 pl-4">
                          <li>{t.openBisAuthorizationStep}</li>
                          <li>{t.copyCodeStep}</li>
                          {showManualAuthorizationInput ? (
                            <li>{t.pasteCodeStep}</li>
                          ) : (
                            <li>{t.setEnvCodeStep}</li>
                          )}
                          <li>{t.exchangeCodeStep}</li>
                        </ol>
                      </div>

                      <form action={completeBisManualAuthorizationAction} className="space-y-2 max-w-2xl">
                        <input type="hidden" name="siteId" value={siteId} />
                        {showManualAuthorizationInput ? (
                          <>
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
                          </>
                        ) : null}
                        <SubmitButton
                          text="Complete BIS connection"
                          variant="secondary"
                          className="w-fit"
                        />
                      </form>

                      {!hasManualAuthorizationCode && showManualAuthorizationInput ? (
                        <p className="text-xs text-muted-foreground">Paste an authorization code above, or set <code>BIS_AUTHORIZATION_CODE</code> in the environment before completing the connection.</p>
                      ) : null}
                    </div>
                  )
                ) : (
                  <form action={disconnectBisAction}>
                    <input type="hidden" name="siteId" value={siteId} />
                    <SubmitButton text={t.disconnectBis} variant="destructive" className="w-fit" />
                  </form>
                )}
              </div>
            </div>

            <div className="rounded-md border p-2">
              <Image
                src="/frontend/pages/Settings/ExplanationBisConnection.png"
                alt="BIS rights and case selection guide"
                width={768}
                height={772}
                className="h-auto w-full rounded-md"
                priority
              />
            </div>
          </div>
        </div>


        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">{t.bisCaseForSite}</div>
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
                    {t.selectBisCase}
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

                <SubmitButton text={t.saveBisCase} className="w-fit" />
              </form>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {t.noCases}
              </p>
            )
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {t.connectFirst}
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        {t.disconnectNote}
      </CardFooter>
    </Card>
  );
}
