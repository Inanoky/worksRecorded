// DialogWindow.tsx
"use client";
import * as React from "react";
import {
  ScrollArea,
} from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { DialogTable } from "@/components/SiteDiaryComponents/DiealogueTable";
import ImageGallery from "@/components/SiteDiaryComponents/ImageGallery";
import { X } from "lucide-react";

export default function DialogWindow({ open, setOpen, date, siteId, onSaved }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
<div className="relative w-[95vw] max-w-[95vw] h-[95vh] sm:w-[90vw] sm:max-w-[90vw] md:max-w-[750px] lg:max-w-[1700px] bg-background rounded-lg border shadow-lg flex flex-col p-6 overflow-y-auto">        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">
            {date
              ? date.toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "No date selected"}
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setOpen(false)}
            className="rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col flex-1 gap-4 pr-4">
            <DialogTable
              className="overflow-hidden flex-1 min-h-[200px]"
              date={date}
              siteId={siteId}
              onSaved={() => {
                onSaved && onSaved();
                setOpen(false);
              }}
            />

            <ImageGallery
              date={date}
              siteId={siteId}
              className="flex-1"
            />
          </div>
        </ScrollArea>

        <div className="flex justify-end mt-4">
          <Button 
            variant="outline"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto active:scale-95 active:bg-muted transition-transform"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}