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

export default function DialogWindow({ open, setOpen, date, siteId, onSaved }) {

  console.log(date)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Limit the overall height of the dialog to 90 % of the viewport */}
      <DialogContent className="sm:max-w-[425px] md:max-w-[750px] lg:max-w-[1700px] max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
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

        <div className="flex flex-col flex-1 gap-4">
          {/* The table section scrolls when its content grows beyond 35 vh */}

            <DialogTable
              className=" overflow-hidden"
              date={date}
              siteId={siteId}
              onSaved={() => {
                onSaved && onSaved();
                setOpen(false);
              }}
            />
          

          {/* Constrain the gallery’s height, but let its internal ScrollArea
              handle overflow. No extra scrollbar is added here. */}
          <ImageGallery
            date={date}
            siteId={siteId}
            className="max-h-[40vh] overflow-hidden"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="mb-10">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
