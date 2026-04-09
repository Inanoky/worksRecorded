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
import TourRunner from "@/components/joyride/TourRunner";
import { getSiteDiaryDialogMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";


export default function DialogWindow({ open, setOpen, date, siteId, onSaved, organizationLanguage }) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const t = getSiteDiaryDialogMessages(normalizeOrganizationLanguage(organizationLanguage));
  const dateLocale = normalizeOrganizationLanguage(organizationLanguage) === "lv" ? "lv-LV" : "en-GB";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="
          w-[100vw] max-w-[100vw] rounded-none p-0
          sm:w-[95vw] sm:max-w-[95vw] sm:rounded-lg sm:p-6
          md:max-w-[750px] lg:max-w-[1700px]
          flex flex-col
          h-[100dvh] max-h-[100dvh]
          sm:h-auto sm:max-h-[90vh]
          !top-0 !translate-y-0
          sm:!top-[5%] sm:!translate-y-0
        "
        onInteractOutside={(e) => e.preventDefault()} // 👈 don’t close on outside click
      >
        <DialogHeader className="px-4 pt-4 pb-2 sm:px-0 sm:pt-0 sm:pb-0">
          <DialogTitle className="text-lg sm:text-xl">
            {date
              ? date.toLocaleDateString(dateLocale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : t.noDateSelected}
          </DialogTitle>
          <DialogDescription className="w-full" />
        </DialogHeader>

        {/* SCROLLING CONTAINER */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto px-4 pb-4 sm:px-0 sm:pb-0">
          {/* Table area – Joyride target */}
          <div data-tour="dialog-table">
            <DialogTable
              key={refreshKey}
              className="flex-none"
              date={date}
              siteId={siteId}
              organizationLanguage={organizationLanguage}
              onSaved={() => {
                onSaved && onSaved();
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>

          {/* Gallery area – Joyride target */}
          <div data-tour="dialog-gallery" className="flex-1 min-h-[300px]">
            <ImageGallery date={date} siteId={siteId} organizationLanguage={organizationLanguage} />
          </div>
        </div>

        <DialogFooter className="border-t bg-background px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              {t.close}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
