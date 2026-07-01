import { FileCheck2 } from "lucide-react";

type TgemFlowPlaceholderProps = {
  title?: string;
  description?: string;
};

export function TgemFlowPlaceholder({
  title = "TGEM invoice approval",
  description = "TGEM flow is separated and ready for the invoice approval module.",
}: TgemFlowPlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-2 py-4 sm:px-4">
      <div className="rounded-md border bg-background p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
            <FileCheck2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
