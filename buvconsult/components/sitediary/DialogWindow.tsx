"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogTable } from "@/components/sitediary/DiealogueTable";
import ImageGallery from "@/components/sitediary/ImageGallery";

export default function DialogWindow({ open, setOpen, date, siteId, onSaved }) {

  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="
          w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[90vw] md:max-w-[750px] 
          lg:max-w-[1700px] flex flex-col 
          
          max-h-[90vh]                               // Limits height to 90% of viewport
          **!top-[5%] !translate-y-0 sm:!top-[5%] sm:!translate-y-0** // Fixed position override
        "
      >
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {date
              ? date.toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
              : "No date selected"}
          </DialogTitle>
          <DialogDescription className="w-full" />
        </DialogHeader>

        {/* SCROLLING CONTAINER: Handles overflow-y for the content area */}
        <div className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-6 -mx-6 -my-4">

          <DialogTable
            key={refreshKey}
            className="**flex-none**" // Optimized: Table only takes space required for its content
            date={date}
            siteId={siteId}
            onSaved={() => {
              onSaved && onSaved()
              setRefreshKey((k) => k + 1);
            }}
          />

          <ImageGallery
            date={date}
            siteId={siteId}
            className="**flex-1 min-h-[300px]**" // Optimized: Gallery takes all remaining space, ensuring a minimum height
          />
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}