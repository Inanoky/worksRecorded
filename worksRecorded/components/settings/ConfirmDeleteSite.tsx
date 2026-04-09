"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from  "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/dashboard/SubmitButtons";
import { DeleteSite } from "@/server/actions/shared-actions";
import { getSiteSettingsMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

export function ConfirmDeleteSite({ siteId, organizationLanguage }: { siteId: string; organizationLanguage?: string | null }) {
  const [open, setOpen] = React.useState(false);
  const t = getSiteSettingsMessages(normalizeOrganizationLanguage(organizationLanguage));

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{t.deleteEverything}</Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.deleteProjectQuestion}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.deleteProjectDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>

          <form action={DeleteSite}>
            <input type="hidden" name="siteId" value={siteId} />
            <SubmitButton text={t.yesDelete} variant="destructive" />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
