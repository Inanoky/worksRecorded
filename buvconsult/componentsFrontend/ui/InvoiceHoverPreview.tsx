"use client";

import Link from "next/link";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/componentsFrontend/ui/hover-card";

interface InvoiceHoverPreviewProps {
  url: string;
  label?: string;
}

export function InvoiceHoverPreview({
  url,
  label = "View invoice",
}: InvoiceHoverPreviewProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {label}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        className="w-48 h-48 p-1 bg-white border rounded shadow-lg"
      >
        <object
          data={url}
          type="application/pdf"
          className="w-full h-full"
        >
          <div className="flex items-center justify-center w-full h-full text-sm text-gray-500">
            PDF preview not available
          </div>
        </object>
      </HoverCardContent>
    </HoverCard>
  );
}