import { ExternalLink, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ResetCheckpointButton } from "@/components/ai-context/ResetCheckpointButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAiContextDiagnostics,
  getDashboardAiContextInspection,
} from "@/server/actions/ai-context-actions";

function formatDate(value: string | null) {
  if (!value) return "No checkpoint";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function stringifyMetadata(value: unknown) {
  if (!value) return "{}";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getToolModeBadgeVariant(toolMode: string) {
  if (toolMode === "read-only") return "secondary";
  if (toolMode === "structured-save") return "outline";
  return "default";
}

function getFlagBadgeVariant(severity: string) {
  if (severity === "critical") return "destructive";
  if (severity === "warning") return "outline";
  return "secondary";
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function PolicyDetailsPopover({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
          Details
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3 text-sm">
        <div className="font-medium">{title}</div>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export default async function AiContextPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const diagnostics = await getAiContextDiagnostics(siteId);
  const dashboardThread = diagnostics.threads.find((thread) => thread.flowName === "dashboard-chat");
  const dashboardInspection = dashboardThread
    ? await getDashboardAiContextInspection(siteId, dashboardThread.id)
    : null;
  const flowTags = [
    "flow:dashboard-chat",
    "flow:whatsapp-site-manager",
    "flow:whatsapp-worker",
    "flow:structured-site-diary-save",
    "flow:structured-worker-diary-save",
    "flow:site-diary-agent",
    "flow:timesheets-agent",
    "flow:bis-materials-agent",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Context</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Inspect how AI memory is keyed for this project and use LangSmith tags to trace prompt,
            tool, and structured-output context.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit gap-2">
          <Link href={diagnostics.langSmith.url} target="_blank" rel="noreferrer">
            Open LangSmith
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Project</CardTitle>
            <CardDescription>{diagnostics.site.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Site ID</span>
              <code className="max-w-[220px] truncate text-xs">{siteId}</code>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">WhatsApp selected site</span>
              <code className="max-w-[220px] truncate text-xs">
                {diagnostics.user.lastSelectedSiteIdforWhatsapp ?? "None"}
              </code>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>LangSmith</CardTitle>
            <CardDescription>
              {diagnostics.langSmith.project || "No project name configured"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={diagnostics.langSmith.enabled ? "default" : "secondary"}>
                {diagnostics.langSmith.enabled ? "Tracing enabled" : "Tracing not enabled"}
              </Badge>
            </div>
            <div className="break-all text-muted-foreground">
              {diagnostics.langSmith.endpoint ?? "No endpoint configured"}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Control Scope</CardTitle>
            <CardDescription>Checkpoint reset only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-green-700" />
              <span>Reset clears AI memory rows for one thread. Business data is untouched.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {dashboardInspection ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dashboard Context Inspector</CardTitle>
            <CardDescription>
              Read-only view of the context stack for the dashboard agent before any compaction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Thread</div>
                <code className="mt-1 block truncate text-xs">{dashboardInspection.threadId}</code>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Estimated tokens</div>
                <div className="mt-1 text-lg font-semibold">
                  {formatCompactNumber(dashboardInspection.totals.estimatedTokens)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Stored checkpoints</div>
                <div className="mt-1 text-lg font-semibold">{dashboardInspection.checkpointCount}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Latest memory</div>
                <div className="mt-1 text-sm">
                  {dashboardInspection.latestCheckpointAgeDays === null
                    ? "No checkpoint"
                    : `${dashboardInspection.latestCheckpointAgeDays} day(s) old`}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Controlled memory savings</div>
                <div className="mt-1 text-lg font-semibold">
                  ~{formatCompactNumber(dashboardInspection.controlledMemory.tokensSaved)} tokens
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Compacted tool outputs</div>
                <div className="mt-1 text-lg font-semibold">
                  {dashboardInspection.controlledMemory.compactedCount}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Largest stored tool payload</div>
                <div className="mt-1 text-lg font-semibold">
                  {formatCompactNumber(dashboardInspection.controlledMemory.storedLargestToolMessageChars)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Stored raw payload status</div>
                <div className="mt-1 text-sm">
                  {dashboardInspection.controlledMemory.hasLargeRawStoredToolPayload
                    ? "Large payload remains"
                    : "No large payload detected"}
                </div>
              </div>
            </div>

            {dashboardInspection.controlledMemory.compactedTools.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {dashboardInspection.controlledMemory.compactedTools.map((tool) => (
                  <Badge key={tool} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Badge variant={getToolModeBadgeVariant(dashboardInspection.policy.toolMode)}>
                {dashboardInspection.policy.toolModeLabel}
              </Badge>
              <Badge variant="outline">Scope: {dashboardInspection.policy.memoryScopeLabel}</Badge>
              <Badge variant="outline">Risk: {dashboardInspection.policy.mutationRisk}</Badge>
            </div>

            {dashboardInspection.flags.length > 0 ? (
              <div className="space-y-2">
                {dashboardInspection.flags.map((flag) => (
                  <div key={flag.id} className="flex flex-col gap-1 rounded-md border p-3 text-sm md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium">{flag.label}</div>
                      <div className="text-muted-foreground">{flag.detail}</div>
                    </div>
                    <Badge variant={getFlagBadgeVariant(flag.severity)}>{flag.severity}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                No obvious context garbage flags from the current checkpoint metrics.
              </div>
            )}

            <div className="space-y-3">
              <div className="text-sm font-medium">Context Stack</div>
              {dashboardInspection.layers.map((layer) => {
                const weight =
                  dashboardInspection.totals.chars > 0
                    ? Math.max(4, Math.round((layer.chars / dashboardInspection.totals.chars) * 100))
                    : 0;

                return (
                  <div key={layer.id} className="rounded-md border p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{layer.label}</span>
                          <Badge variant="secondary">{layer.kind}</Badge>
                          {typeof layer.count === "number" ? (
                            <Badge variant="outline">Count: {layer.count}</Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{layer.description}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Source: {layer.source}</div>
                      </div>
                      <div className="shrink-0 text-left text-sm md:text-right">
                        <div>{formatCompactNumber(layer.chars)} chars</div>
                        <div className="text-muted-foreground">
                          ~{formatCompactNumber(layer.estimatedTokens)} tokens
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-foreground/70" style={{ width: `${weight}%` }} />
                    </div>
                    {layer.preview ? (
                      <div className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                        {layer.preview}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Checkpoint Threads</CardTitle>
          <CardDescription>
            These are the existing LangGraph thread IDs used to build conversational memory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Context</TableHead>
                <TableHead>Flow</TableHead>
                <TableHead>Thread ID</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead className="text-right">Checkpoints</TableHead>
                <TableHead className="text-right">Writes</TableHead>
                <TableHead className="text-right">Blobs</TableHead>
                <TableHead>Latest</TableHead>
                <TableHead className="text-right">Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diagnostics.threads.map((thread) => (
                <TableRow key={thread.id}>
                  <TableCell>
                    <div className="font-medium">{thread.label}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{thread.owner}</Badge>
                      {thread.contextPolicy.notes ? (
                        <PolicyDetailsPopover title={`${thread.label} memory note`}>
                          <p className="text-muted-foreground">{thread.contextPolicy.notes}</p>
                        </PolicyDetailsPopover>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{thread.flow}</div>
                    <code className="text-xs text-muted-foreground">{thread.flowName}</code>
                    <div className="mt-2">
                      <Badge variant={getToolModeBadgeVariant(thread.contextPolicy.toolMode)}>
                        {thread.contextPolicy.toolModeLabel}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="block max-w-[280px] truncate text-xs">{thread.id}</code>
                    <PolicyDetailsPopover title="Thread ID pattern">
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          This is the LangGraph checkpoint key used for short-term memory.
                        </p>
                        <code className="block rounded-md bg-muted p-2 text-xs">
                          {thread.contextPolicy.threadIdPattern}
                        </code>
                      </div>
                    </PolicyDetailsPopover>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[180px] text-sm">{thread.contextPolicy.memoryScopeLabel}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{thread.contextPolicy.memoryScope}</Badge>
                      <PolicyDetailsPopover title={`${thread.label} context sources`}>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-medium uppercase text-muted-foreground">
                              Context sources
                            </div>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                              {thread.contextPolicy.contextSources.map((source) => (
                                <li key={source}>{source}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-xs font-medium uppercase text-muted-foreground">
                              Reset meaning
                            </div>
                            <p className="mt-1 text-muted-foreground">
                              {thread.contextPolicy.resetExplanation}
                            </p>
                          </div>
                        </div>
                      </PolicyDetailsPopover>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{thread.checkpointCount}</TableCell>
                  <TableCell className="text-right">{thread.writeCount}</TableCell>
                  <TableCell className="text-right">{thread.blobCount}</TableCell>
                  <TableCell>
                    <div>{formatDate(thread.latestCheckpointTs)}</div>
                    {thread.latestCheckpointId ? (
                      <code className="block max-w-[180px] truncate text-xs text-muted-foreground">
                        {thread.latestCheckpointId}
                      </code>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <ResetCheckpointButton
                      siteId={siteId}
                      threadId={thread.id}
                      label={thread.label}
                      disabled={thread.checkpointCount === 0 && thread.writeCount === 0 && thread.blobCount === 0}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>LangSmith Search Tags</CardTitle>
            <CardDescription>
              Filter LangSmith runs by these tags to visualize prompt, tool, and nested structured calls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">works-recorded</Badge>
              <Badge variant="outline">site:{siteId}</Badge>
              {flowTags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Search className="mt-0.5 h-4 w-4" />
              <span>
                Search by the thread ID when you need to match one dashboard or WhatsApp conversation
                to its LangSmith trace.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Latest Checkpoint Metadata</CardTitle>
            <CardDescription>
              The first thread with stored metadata is shown here for quick inspection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[320px] overflow-auto rounded-md bg-muted p-3 text-xs">
              {stringifyMetadata(
                diagnostics.threads.find((thread) => thread.latestMetadata)?.latestMetadata,
              )}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
