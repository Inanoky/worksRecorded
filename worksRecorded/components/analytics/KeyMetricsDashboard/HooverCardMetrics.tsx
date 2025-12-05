"use client";

import { CircleQuestionMark } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

type Props = {
  markdown?: string | null;   // <-- text with markdown
  className?: string;
  title?: string;
};

export function ReasonHover({ markdown, className, title = "Details" }: Props) {
  const content = markdown?.trim() || "_No details provided._";

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={`p-1 rounded-md hover:bg-muted/60 cursor-help ${className ?? ""}`}
          aria-label="Show details"
        >
          <CircleQuestionMark className="size-5" />
        </button>
      </HoverCardTrigger>

      <HoverCardContent side="top" align="end" className="w-80 max-h-64 overflow-auto space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>

        {/* Typography wrapper for nicer defaults (requires @tailwindcss/typography) */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
          >
            {content}
          </ReactMarkdown>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
