"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {DialogTable} from "@/components/SiteDiaryComponents/DiealogueTable";

// No internal open state! Use only props!
export default function DialogWindow({ open, setOpen, children, date, siteId}) {
  return (

    <Dialog  open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[750px] lg:max-w-[1700px] max-h-[900px]">
        <DialogHeader>
          <DialogTitle>
            {date
                ? date.toLocaleDateString("en-GB", {year: "numeric", month: "long", day: "numeric"})
                : "No date selected"}
          </DialogTitle>
          <DialogDescription className="w-full">

          </DialogDescription>
        </DialogHeader>
        <div className=" overflow-x-auto overflow-y-auto ">



            <DialogTable date={date} siteId={siteId}/>

        </div>
          <div className="mt-4 flex justify-end">


          </div>


          <DialogFooter>

                  <DialogClose asChild>

                    <Button
                      variant="outline"

                    >
                      Close
                    </Button>
                  </DialogClose>
          </DialogFooter>
      </DialogContent>

    </Dialog>

);
}