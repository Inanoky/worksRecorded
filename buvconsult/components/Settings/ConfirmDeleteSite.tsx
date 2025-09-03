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
import { SubmitButton } from "@/app/components/dashboard/SubmitButtons";
import { DeleteSite } from "@/app/actions/actions";

export function ConfirmDeleteSite({ siteId }: { siteId: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Everything</Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. It will permanently delete this site and **all** related data (invoices, documents, templates, etc.).
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <form action={DeleteSite}>
            <input type="hidden" name="siteId" value={siteId} />
            <SubmitButton text="Yes, delete" variant="destructive" />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
