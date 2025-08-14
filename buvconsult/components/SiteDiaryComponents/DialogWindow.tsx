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
import { DialogTable } from "@/components/SiteDiaryComponents/DiealogueTable";
import ImageGallery from "@/components/SiteDiaryComponents/ImageGallery";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DialogWindow({ open, setOpen, date, siteId, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] sm:w-[90vw] sm:max-w-[90vw] md:max-w-[750px] lg:max-w-[1700px] flex flex-col">
        <DialogHeader className="sticky top-0 bg-background z-10">
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

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-4 p-1">
            <DialogTable
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
              className="max-h-[40vh] sm:max-h-[45vh]"
            />
          </div>
        </ScrollArea>

        <DialogFooter className="sticky bottom-0 bg-background z-10 pt-4">
          <DialogClose asChild>
            <Button 
              variant="outline"
              className="w-full sm:w-auto active:scale-95 active:bg-muted transition-transform"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}