import { ExternalLink, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAiContextDiagnostics } from "@/server/actions/ai-context-actions";

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

export default async function AiContextPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const diagnostics = await getAiContextDiagnostics(siteId);
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
                    <div className="text-xs text-muted-foreground">{thread.owner}</div>
                  </TableCell>
                  <TableCell>{thread.flow}</TableCell>
                  <TableCell>
                    <code className="block max-w-[280px] truncate text-xs">{thread.id}</code>
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
