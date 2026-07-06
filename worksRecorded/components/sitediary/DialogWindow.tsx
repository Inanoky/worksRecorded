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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DialogTable } from "@/components/sitediary/DiealogueTable";
import { ZtcDialogTable } from "@/components/sitediary/ZTC/ZtcDialogTable";
import ImageGallery from "@/components/sitediary/ImageGallery";
import TourRunner from "@/components/joyride/TourRunner";
import { getSiteDiaryDialogMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

type DialogWindowProps = {
  open: any;
  setOpen: any;
  date: any;
  siteId: any;
  onSaved: any;
  organizationLanguage?: any;
  isZtcFlow?: boolean;
  children?: React.ReactNode;
};

export default function DialogWindow({
  open,
  setOpen,
  date,
  siteId,
  onSaved,
  organizationLanguage,
  isZtcFlow = false,
}: DialogWindowProps) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const t = getSiteDiaryDialogMessages(normalizeOrganizationLanguage(organizationLanguage));
  const dateLocale = normalizeOrganizationLanguage(organizationLanguage) === "lv" ? "lv-LV" : "en-GB";
  const TableComponent = isZtcFlow ? ZtcDialogTable : DialogTable;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="
          w-[100vw] max-w-[100vw] rounded-none p-0
          sm:w-[95vw] sm:max-w-[95vw] sm:rounded-lg sm:p-6
          md:max-w-[750px] lg:max-w-[1700px]
          flex flex-col
          h-[100dvh] max-h-[100dvh]
          sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)]
          !top-0 !translate-y-0
          sm:!top-1/2 sm:!-translate-y-1/2
        "
        onInteractOutside={(e) => e.preventDefault()} // 👈 don’t close on outside click
      >
        <Tabs
          defaultValue="records"
          className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-0 sm:pb-0"
        >
          <div className="grid flex-none gap-3 pt-4 pb-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start sm:gap-4 sm:pt-0 sm:pb-4">
            <DialogHeader className="min-w-0 p-0 text-left">
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

            <TabsList className="grid w-full shrink-0 grid-cols-2 sm:w-[360px] sm:justify-self-center">
              <TabsTrigger value="records">{t.recordsTab}</TabsTrigger>
              <TabsTrigger value="media">{t.mediaTab}</TabsTrigger>
            </TabsList>

            <div aria-hidden="true" className="hidden sm:block" />
          </div>

          <TabsContent
            value="records"
            className="mt-0 min-h-0 flex-1 overflow-y-auto"
          >
            <div data-tour="dialog-table">
              <TableComponent
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
          </TabsContent>

          <TabsContent
            value="media"
            className="mt-0 min-h-0 flex-1 overflow-hidden"
          >
            <div data-tour="dialog-gallery" className="h-full min-h-[300px]">
              <ImageGallery
                date={date}
                siteId={siteId}
                organizationLanguage={organizationLanguage}
                className="h-full"
                scrollAreaClassName="h-full min-h-0"
              />
            </div>
          </TabsContent>
        </Tabs>

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
